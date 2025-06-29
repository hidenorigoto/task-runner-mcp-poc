/**
 * Logger type definitions for MCP server
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface ProtocolMessage {
  type: 'request' | 'response' | 'notification';
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface WorkflowLog {
  phase: string;
  previousPhase?: string;
  workingFiles: string[];
  instruction?: {
    phaseName: string;
    preconditions: string[];
    acceptanceCriteria: string[];
    tasks: string[];
    context?: unknown;
  };
}

export interface TimingInfo {
  start: number;
  end?: number;
  duration?: number;
}

export interface ComprehensiveLog {
  timestamp: string;
  sessionId: string;
  sequenceNumber: number;
  level: LogLevel;
  message?: string;
  protocol?: ProtocolMessage;
  workflow?: WorkflowLog;
  timing?: TimingInfo;
  metadata?: Record<string, unknown>;
  error?: unknown;
}

export interface LoggerOptions {
  sessionId?: string;
  logLevel?: LogLevel;
  consoleOutput?: boolean;
  fileOutput?: boolean;
  logDir?: string;
  maxFileSize?: number;
}