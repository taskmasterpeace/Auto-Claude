import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';
import { transcriptionService } from '../transcription-service';

/**
 * Register audio transcription handlers
 */
export function registerAudioHandlers(mainWindow: BrowserWindow): void {
  /**
   * Transcribe audio blob
   */
  ipcMain.handle(
    IPC_CHANNELS.AUDIO_TRANSCRIBE,
    async (_, audioData: Uint8Array): Promise<IPCResult<{ text: string }>> => {
      try {
        console.log('[IPC] Transcribing audio, size:', audioData.length);
        const buffer = Buffer.from(audioData);
        const result = await transcriptionService.transcribe(buffer, 'audio/webm');

        console.log('[IPC] Transcription complete:', result.text.substring(0, 50) + '...');
        return {
          success: true,
          data: { text: result.text }
        };
      } catch (error) {
        console.error('[IPC] Audio transcription failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Transcription failed'
        };
      }
    }
  );

  /**
   * Check if Whisper model is downloaded
   */
  ipcMain.handle(
    IPC_CHANNELS.AUDIO_CHECK_MODEL,
    async (): Promise<IPCResult<boolean>> => {
      try {
        const ready = await transcriptionService.isModelReady();
        return { success: true, data: ready };
      } catch (error) {
        return { success: false, error: 'Failed to check model status' };
      }
    }
  );

  /**
   * Download Whisper model
   */
  ipcMain.handle(
    IPC_CHANNELS.AUDIO_DOWNLOAD_MODEL,
    async (): Promise<IPCResult<boolean>> => {
      try {
        const success = await transcriptionService.initialize((percent) => {
          mainWindow.webContents.send(IPC_CHANNELS.AUDIO_MODEL_PROGRESS, percent);
        });
        return { success, data: success };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Model download failed'
        };
      }
    }
  );

  console.log('[IPC] Audio transcription handlers registered');
}
