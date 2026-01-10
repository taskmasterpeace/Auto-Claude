import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import whisper from '@kutalia/whisper-node-addon';

export interface TranscriptionResult {
  text: string;
  duration: number;
  language?: string;
}

export class TranscriptionService {
  private modelPath: string;
  private modelsDir: string;
  private isInitialized = false;

  constructor() {
    // Store models in app data directory
    this.modelsDir = path.join(app.getPath('userData'), 'whisper-models');
    this.modelPath = path.join(this.modelsDir, 'ggml-base.bin');
  }

  /**
   * Initialize service and download model if needed
   */
  async initialize(onProgress?: (percent: number) => void): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Ensure models directory exists
      await fs.mkdir(this.modelsDir, { recursive: true });

      // Check if model exists
      if (!existsSync(this.modelPath)) {
        console.log('[Transcription] Downloading Whisper base model...');
        await this.downloadModel(onProgress);
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[Transcription] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Download Whisper base model (~142MB)
   */
  private async downloadModel(onProgress?: (percent: number) => void): Promise<void> {
    const modelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin';

    const response = await fetch(modelUrl);
    if (!response.ok) {
      throw new Error(`Failed to download model: ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
    let downloadedSize = 0;

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to read download stream');

    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      downloadedSize += value.length;

      if (onProgress && totalSize > 0) {
        const percent = Math.floor((downloadedSize / totalSize) * 100);
        onProgress(percent);
      }
    }

    // Combine chunks and write to file
    const buffer = Buffer.concat(chunks);
    await fs.writeFile(this.modelPath, buffer);

    console.log('[Transcription] Model downloaded successfully');
  }

  /**
   * Check if model is downloaded
   */
  async isModelReady(): Promise<boolean> {
    return existsSync(this.modelPath);
  }

  /**
   * Get file extension from mimeType
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/webm': '.webm',
      'audio/mp3': '.mp3',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/wave': '.wav',
      'audio/x-wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/mp4': '.m4a',
      'audio/m4a': '.m4a',
      'audio/x-m4a': '.m4a',
      'audio/flac': '.flac',
      'audio/aac': '.aac',
    };
    return mimeToExt[mimeType.toLowerCase()] || '.webm';
  }

  /**
   * Transcribe audio buffer
   */
  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) {
        throw new Error('Transcription service not initialized');
      }
    }

    // Create temp file for audio with correct extension
    const tempDir = path.join(app.getPath('temp'), 'auto-claude-audio');
    await fs.mkdir(tempDir, { recursive: true });

    const extension = this.getExtensionFromMimeType(mimeType);
    const tempAudioPath = path.join(tempDir, `audio-${Date.now()}${extension}`);

    try {
      // Write audio buffer to temp file
      await fs.writeFile(tempAudioPath, audioBuffer);

      // Transcribe using whisper.cpp
      const startTime = Date.now();

      const result = await whisper.transcribe({
        fname_inp: tempAudioPath,
        model: this.modelPath,
        language: 'auto' // Auto-detect language
      });

      const duration = (Date.now() - startTime) / 1000;

      // Result is { transcription: string[] } - join segments
      const transcriptionText = Array.isArray(result.transcription)
        ? result.transcription.flat().join(' ')
        : '';

      return {
        text: transcriptionText.trim(),
        duration,
        language: undefined // Whisper addon doesn't return detected language
      };

    } finally {
      // Cleanup temp files
      try {
        if (existsSync(tempAudioPath)) await fs.unlink(tempAudioPath);
      } catch (err) {
        console.error('[Transcription] Cleanup error:', err);
      }
    }
  }
}

// Singleton instance
export const transcriptionService = new TranscriptionService();
