/**
 * Core Logger implementation for MCP server
 */

import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import type { WriteStream } from 'fs';
import { LogLevel } from '../types/logger.js';
import type { 
  ComprehensiveLog, 
  LoggerOptions, 
  ProtocolMessage,
  WorkflowLog,
  TimingInfo
} from '../types/logger.js';

export class Logger {
  private readonly sessionId: string;
  private sequenceNumber = 0;
  private logLevel: LogLevel;
  private consoleOutput: boolean;
  private fileOutput: boolean;
  private logStream: WriteStream | undefined;
  private logFilePath?: string;

  constructor(options: LoggerOptions = {}) {
    this.sessionId = options.sessionId || this.generateSessionId();
    this.logLevel = options.logLevel || LogLevel.INFO;
    this.consoleOutput = options.consoleOutput ?? true;
    this.fileOutput = options.fileOutput ?? true;

    if (this.fileOutput) {
      this.initializeFileLogging(options.logDir || './logs');
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private initializeFileLogging(logDir: string): void {
    try {
      mkdirSync(logDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `mcp-${this.sessionId}-${timestamp}.jsonl`;
      this.logFilePath = join(logDir, filename);
      this.logStream = createWriteStream(this.logFilePath, { flags: 'a' });
      
      // Handle stream errors
      this.logStream.on('error', (error) => {
        console.error('Log stream error:', error);
        this.fileOutput = false;
        this.logStream = undefined;
      });
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
      this.fileOutput = false;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatConsoleOutput(log: ComprehensiveLog): string {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const color = colors[log.level];

    let output = `${color}[${log.timestamp}] ${log.level.toUpperCase()}${reset}`;
    
    if (log.message) {
      output += ` ${log.message}`;
    }

    if (log.protocol) {
      output += `\n  Protocol: ${log.protocol.type} ${log.protocol.method || ''}`;
    }

    if (log.workflow) {
      output += `\n  Workflow: ${log.workflow.phase}`;
    }

    if (log.error) {
      let errorMessage: string;
      if (log.error instanceof Error) {
        errorMessage = log.error.message;
      } else if (typeof log.error === 'object' && log.error !== null) {
        errorMessage = JSON.stringify(log.error);
      } else if (log.error === null) {
        errorMessage = 'null';
      } else if (log.error === undefined) {
        errorMessage = 'undefined';
      } else {
        // For primitive types, String() is safe
        errorMessage = String(log.error as string | number | boolean | symbol | bigint);
      }
      output += `\n  Error: ${errorMessage}`;
    }

    return output;
  }

  public log(
    level: LogLevel,
    message?: string,
    data?: {
      protocol?: ProtocolMessage;
      workflow?: WorkflowLog;
      timing?: TimingInfo;
      metadata?: Record<string, unknown>;
      error?: unknown;
    }
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const log: ComprehensiveLog = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      sequenceNumber: this.sequenceNumber++,
      level,
      ...(message !== undefined && { message }),
      ...(data?.protocol && { protocol: data.protocol }),
      ...(data?.workflow && { workflow: data.workflow }),
      ...(data?.timing && { timing: data.timing }),
      ...(data?.metadata && { metadata: data.metadata }),
      ...(data?.error !== undefined && { error: data.error }),
    };

    // Console output
    if (this.consoleOutput) {
      const formatted = this.formatConsoleOutput(log);
      if (level === LogLevel.ERROR) {
        console.error(formatted);
      } else if (level === LogLevel.WARN) {
        console.warn(formatted);
      } else {
        process.stdout.write(formatted + '\n');
      }
    }

    // File output
    if (this.fileOutput && this.logStream) {
      this.logStream.write(JSON.stringify(log) + '\n');
    }
  }

  public debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, { ...data, error });
  }

  public logProtocol(protocol: ProtocolMessage, timing?: TimingInfo): void {
    const message = `${protocol.type}: ${protocol.method || 'unknown'}`;
    this.log(LogLevel.INFO, message, { protocol, ...(timing && { timing }) });
  }

  public logWorkflow(workflow: WorkflowLog, metadata?: Record<string, unknown>): void {
    const message = `Workflow phase: ${workflow.phase}`;
    this.log(LogLevel.INFO, message, { workflow, ...(metadata && { metadata }) });
  }

  public close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = undefined;
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getLogFilePath(): string | undefined {
    return this.logFilePath;
  }
}