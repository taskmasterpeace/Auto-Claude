import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Debug logger for troubleshooting context features
 * Writes logs to userData/logs/context-debug.log
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
} as const;

type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

class DebugLogger {
  private logFilePath: string;
  private enabled: boolean;
  private logLevel: LogLevel;

  constructor() {
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.logFilePath = path.join(logsDir, 'context-debug.log');
    this.enabled = process.env.DEBUG_CONTEXT === 'true' || !app.isPackaged;
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || LOG_LEVELS.INFO;

    // Initialize log file
    this.log(LOG_LEVELS.INFO, 'DebugLogger', 'Initialized', {
      logFilePath: this.logFilePath,
      enabled: this.enabled,
      logLevel: this.logLevel
    });
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;

    const levels = [LOG_LEVELS.ERROR, LOG_LEVELS.WARN, LOG_LEVELS.INFO, LOG_LEVELS.DEBUG];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data !== undefined ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${context}] ${message}${dataStr}\n`;
  }

  log(level: LogLevel, context: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, context, message, data);

    try {
      fs.appendFileSync(this.logFilePath, formattedMessage, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }

    // Also log to console in development
    if (!app.isPackaged) {
      console.log(formattedMessage.trim());
    }
  }

  error(context: string, message: string, error?: Error | unknown, data?: unknown): void {
    const baseData = (data && typeof data === 'object') ? data as Record<string, unknown> : {};
    const errorData = error instanceof Error
      ? { ...baseData, error: error.message, stack: error.stack }
      : { ...baseData, error };
    this.log(LOG_LEVELS.ERROR, context, message, errorData);
  }

  warn(context: string, message: string, data?: unknown): void {
    this.log(LOG_LEVELS.WARN, context, message, data);
  }

  info(context: string, message: string, data?: unknown): void {
    this.log(LOG_LEVELS.INFO, context, message, data);
  }

  debug(context: string, message: string, data?: unknown): void {
    this.log(LOG_LEVELS.DEBUG, context, message, data);
  }

  /**
   * Log function entry for tracing execution flow
   */
  enter(context: string, functionName: string, args?: unknown): void {
    this.debug(context, `→ ${functionName}`, args);
  }

  /**
   * Log function exit for tracing execution flow
   */
  exit(context: string, functionName: string, result?: unknown): void {
    this.debug(context, `← ${functionName}`, result);
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Clear the log file
   */
  clear(): void {
    try {
      fs.writeFileSync(this.logFilePath, '', 'utf8');
      this.info('DebugLogger', 'Log file cleared');
    } catch (error) {
      console.error('Failed to clear log file:', error);
    }
  }

  /**
   * Get the last N lines from the log file
   */
  getRecentLogs(lines: number = 50): string[] {
    try {
      const content = fs.readFileSync(this.logFilePath, 'utf8');
      const allLines = content.split('\n').filter((line) => line.trim() !== '');
      return allLines.slice(-lines);
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();
