import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  UseSpeechRecognitionReturn,
  SpeechRecognitionError,
  SpeechRecognitionErrorCode,
  SpeechRecognitionOptions
} from '../../shared/types/speech';
import { SPEECH_ERROR_MESSAGES } from '../../shared/types/speech';

// Web Speech API types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: SpeechRecognitionErrorCode;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// Check for browser support
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Standard and vendor-prefixed versions
  return (
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition ||
    null
  );
}

const defaultOptions: SpeechRecognitionOptions = {
  continuous: true,
  interimResults: true,
  language: 'en-US'
};

/**
 * Custom hook for speech recognition using the Web Speech API
 *
 * Provides browser support detection, start/stop methods, and transcript
 * state management with proper error handling and cleanup.
 *
 * @param options - Configuration options for speech recognition
 * @returns Speech recognition state and control methods
 */
export function useSpeechRecognition(
  options: SpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const mergedOptions = { ...defaultOptions, ...options };

  // State
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  // Browser support detection
  const SpeechRecognitionClass = getSpeechRecognition();
  const isSupported = SpeechRecognitionClass !== null;

  // Refs for recognition instance and cleanup
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isManualStopRef = useRef(false);

  // Create error object from error code
  const createError = useCallback((code: SpeechRecognitionErrorCode): SpeechRecognitionError => {
    return {
      code,
      message: SPEECH_ERROR_MESSAGES[code] || 'An unknown error occurred.'
    };
  }, []);

  // Initialize recognition instance
  const initializeRecognition = useCallback(() => {
    if (!SpeechRecognitionClass || recognitionRef.current) {
      return recognitionRef.current;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = mergedOptions.continuous ?? true;
    recognition.interimResults = mergedOptions.interimResults ?? true;
    recognition.lang = mergedOptions.language ?? 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimText += transcriptText;
        }
      }

      if (finalTranscript) {
        setTranscript((prev: string) => prev + finalTranscript);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interimText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorCode = event.error;

      // Don't treat 'aborted' as an error when manually stopped
      if (errorCode === 'aborted' && isManualStopRef.current) {
        isManualStopRef.current = false;
        return;
      }

      // Handle no-speech differently - it's not necessarily an error
      if (errorCode === 'no-speech') {
        setError(createError(errorCode));
        setIsListening(false);
        return;
      }

      setError(createError(errorCode));
      setIsListening(false);
    };

    recognition.onend = () => {
      // Only restart if we weren't manually stopped and still want to listen
      // This handles the case where recognition stops due to silence
      if (!isManualStopRef.current && isListening) {
        try {
          recognition.start();
        } catch {
          // Ignore errors when trying to restart
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
      isManualStopRef.current = false;
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [SpeechRecognitionClass, mergedOptions.continuous, mergedOptions.interimResults, mergedOptions.language, createError, isListening]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError({
        code: 'service-not-allowed',
        message: SPEECH_ERROR_MESSAGES['service-not-allowed']
      });
      return;
    }

    // Clear previous error
    setError(null);
    isManualStopRef.current = false;

    const recognition = initializeRecognition();
    if (!recognition) {
      return;
    }

    try {
      recognition.start();
    } catch (err) {
      // Handle the case where recognition is already started
      if (err instanceof Error && err.message.includes('already started')) {
        // Already listening, ignore
        return;
      }
      setError({
        code: 'audio-capture',
        message: SPEECH_ERROR_MESSAGES['audio-capture']
      });
    }
  }, [isSupported, initializeRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    isManualStopRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
    }

    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        isManualStopRef.current = true;
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    // Transcript state
    transcript,
    interimTranscript,

    // Recording state
    isListening,
    isSupported,

    // Error state
    error,

    // Actions
    startListening,
    stopListening,
    resetTranscript
  };
}
