/**
 * Speech recognition types for voice recording and transcription
 */

// Speech recognition error types as defined by the Web Speech API
export type SpeechRecognitionErrorCode =
  | 'not-allowed'    // Permission denied
  | 'no-speech'      // No speech detected
  | 'network'        // Network error during transcription
  | 'aborted'        // Recognition aborted
  | 'audio-capture'  // No microphone found
  | 'service-not-allowed' // Service not allowed
  | 'bad-grammar'    // Grammar error
  | 'language-not-supported'; // Language not supported

// Recording state for visual feedback
export type RecordingState = 'idle' | 'recording' | 'error';

// Speech recognition result from a single utterance
export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

// Error information for speech recognition failures
export interface SpeechRecognitionError {
  code: SpeechRecognitionErrorCode;
  message: string;
}

// State management for speech recognition
export interface SpeechRecognitionState {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: SpeechRecognitionError | null;
}

// Return type for the useSpeechRecognition hook
export interface UseSpeechRecognitionReturn {
  // Transcript state
  transcript: string;
  interimTranscript: string;

  // Recording state
  isListening: boolean;
  isSupported: boolean;

  // Error state
  error: SpeechRecognitionError | null;

  // Actions
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

// Options for starting speech recognition
export interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

// User-facing error messages mapped from error codes
export const SPEECH_ERROR_MESSAGES: Record<SpeechRecognitionErrorCode, string> = {
  'not-allowed': 'Microphone access denied. Please enable microphone access in browser settings.',
  'no-speech': 'No speech detected. Try speaking closer to your microphone.',
  'network': 'Transcription unavailable. Please check your internet connection.',
  'aborted': 'Recording was stopped.',
  'audio-capture': 'No microphone detected. Please connect a microphone and try again.',
  'service-not-allowed': 'Speech recognition service is not available.',
  'bad-grammar': 'Speech recognition grammar error.',
  'language-not-supported': 'The selected language is not supported.'
};

// Browser support message for unsupported browsers
export const BROWSER_NOT_SUPPORTED_MESSAGE =
  'Voice recording not supported in this browser. Try Chrome or Edge.';
