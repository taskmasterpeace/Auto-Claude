import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { cn } from '../lib/utils';
import type { AudioRecording, RecordingSession, RecordingState } from '../../shared/types';
import { MAX_AUDIO_DURATION, PREFERRED_AUDIO_TYPES } from '../../shared/constants';

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcription: string, recording: AudioRecording) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceRecorder({
  onTranscriptionComplete,
  disabled = false,
  className
}: VoiceRecorderProps) {
  const [session, setSession] = useState<RecordingSession>({
    state: 'idle',
    duration: 0,
    audioChunks: []
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      cleanup();
    };
  }, []);

  const getSupportedMimeType = (): string => {
    for (const type of PREFERRED_AUDIO_TYPES) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm'; // Fallback
  };

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          setSession((s) => ({
            ...s,
            audioChunks: [...s.audioChunks, e.data]
          }));
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording(chunks, mimeType);
      };

      mediaRecorder.start(1000); // Capture chunks every second

      // Start duration timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        setSession((s) => ({ ...s, duration }));

        // Auto-stop at max duration
        if (duration >= MAX_AUDIO_DURATION) {
          stopRecording();
        }
      }, 100);

      setSession({
        state: 'recording',
        startTime: new Date(),
        duration: 0,
        audioChunks: []
      });

    } catch (error) {
      console.error('Failed to start recording:', error);
      setSession({
        state: 'error',
        duration: 0,
        audioChunks: [],
        error: error instanceof Error
          ? error.message
          : 'Failed to access microphone. Please grant permission.'
      });
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const processRecording = async (chunks: Blob[], mimeType: string) => {
    setSession((s) => ({ ...s, state: 'processing' }));

    try {
      // Combine chunks into single blob
      const audioBlob = new Blob(chunks, { type: mimeType });

      if (audioBlob.size === 0) {
        throw new Error('No audio data recorded');
      }

      // Create recording object
      const recording: AudioRecording = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        filename: `recording-${Date.now()}.webm`,
        mimeType,
        size: audioBlob.size,
        duration: session.duration,
        data: audioBlob
      };

      // Send to main process for transcription
      setSession((s) => ({ ...s, state: 'transcribing' }));

      const result = await window.electronAPI.transcribeAudio(audioBlob);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Transcription failed');
      }

      recording.transcription = result.data.text;
      recording.transcribedAt = new Date();

      setSession({ state: 'complete', duration: session.duration, audioChunks: [] });

      // Call parent callback
      onTranscriptionComplete(result.data.text, recording);

      // Reset after delay
      setTimeout(() => {
        setSession({ state: 'idle', duration: 0, audioChunks: [] });
        cleanup();
      }, 2000);

    } catch (error) {
      console.error('Recording processing failed:', error);
      setSession({
        state: 'error',
        duration: session.duration,
        audioChunks: [],
        error: error instanceof Error ? error.message : 'Failed to process recording'
      });
      cleanup();
    }
  };

  const handleToggle = () => {
    if (session.state === 'recording') {
      stopRecording();
    } else if (session.state === 'idle') {
      startRecording();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isActive = session.state === 'recording';
  const isProcessing = session.state === 'processing' || session.state === 'transcribing';
  const isComplete = session.state === 'complete';
  const hasError = session.state === 'error';

  return (
    <div className={cn('space-y-2', className)}>
      {/* Recording Button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isActive ? 'destructive' : 'outline'}
          size="sm"
          onClick={handleToggle}
          disabled={disabled || isProcessing}
          className={cn(
            'gap-2 transition-all',
            isActive && 'animate-pulse'
          )}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isComplete ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : hasError ? (
            <AlertCircle className="h-4 w-4" />
          ) : isActive ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}

          {isProcessing
            ? session.state === 'transcribing' ? 'Transcribing...' : 'Processing...'
            : isComplete
            ? 'Complete!'
            : hasError
            ? 'Error'
            : isActive
            ? `Stop (${formatDuration(session.duration)})`
            : 'Record Voice'}
        </Button>

        {/* Duration indicator when recording */}
        {isActive && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
            <span>{formatDuration(session.duration)} / {formatDuration(MAX_AUDIO_DURATION)}</span>
          </div>
        )}
      </div>

      {/* Progress bar for max duration */}
      {isActive && (
        <Progress
          value={(session.duration / MAX_AUDIO_DURATION) * 100}
          className="h-1"
        />
      )}

      {/* Error message */}
      {hasError && session.error && (
        <p className="text-xs text-destructive flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{session.error}</span>
        </p>
      )}

      {/* Help text */}
      {!isActive && !isProcessing && !hasError && (
        <p className="text-xs text-muted-foreground">
          Click to record your task description. You can switch apps while recording.
        </p>
      )}
    </div>
  );
}
