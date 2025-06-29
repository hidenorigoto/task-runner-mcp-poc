import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { Logger, LogLevel } from '../../src/logger/index.js';
import { readFileSync, existsSync, rmSync } from 'fs';

describe('Logger', () => {
  let logger: Logger;
  const testLogDir = './test-logs';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    if (logger) {
      logger.close();
    }
    // Clean up test log files
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create logger with default options', () => {
      logger = new Logger();
      expect(logger.getSessionId()).toBeTruthy();
      expect(logger.getLogFilePath()).toBeTruthy();
    });

    it('should create logger with custom session ID', () => {
      const customSessionId = 'test-session-123';
      logger = new Logger({ sessionId: customSessionId });
      expect(logger.getSessionId()).toBe(customSessionId);
    });

    it('should create logger with file output disabled', () => {
      logger = new Logger({ fileOutput: false });
      expect(logger.getLogFilePath()).toBeUndefined();
    });
  });

  describe('log levels', () => {
    it('should respect log level filtering', () => {
      logger = new Logger({ logLevel: LogLevel.WARN, consoleOutput: true });
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockWrite = process.stdout.write as MockedFunction<typeof process.stdout.write>;
      const writeCalls = mockWrite.mock.calls;
      const hasDebugMessage = writeCalls.some(call => 
        typeof call[0] === 'string' && call[0].includes('Debug message')
      );
      expect(hasDebugMessage).toBe(false);
      
      const hasInfoMessage = writeCalls.some(call => 
        typeof call[0] === 'string' && call[0].includes('Info message')
      );
      expect(hasInfoMessage).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warn message')
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error message')
      );
    });
  });

  describe('console output', () => {
    it('should format console output with colors', () => {
      logger = new Logger({ consoleOutput: true, fileOutput: false });
      
      logger.info('Test message');
      
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockWrite = process.stdout.write as MockedFunction<typeof process.stdout.write>;
      const writeCalls = mockWrite.mock.calls;
      const hasCorrectFormat = writeCalls.some(call => {
        if (typeof call[0] === 'string') {
          // Check for ANSI color codes without regex control chars
          return call[0].includes('\x1b[32m') && 
                 call[0].includes('INFO') && 
                 call[0].includes('\x1b[0m') && 
                 call[0].includes('Test message');
        }
        return false;
      });
      expect(hasCorrectFormat).toBe(true);
    });

    it('should include protocol information in console output', () => {
      logger = new Logger({ consoleOutput: true, fileOutput: false });
      
      logger.logProtocol({
        type: 'request',
        method: 'test/method',
        params: { foo: 'bar' }
      });
      
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockWrite = process.stdout.write as MockedFunction<typeof process.stdout.write>;
      const writeCalls = mockWrite.mock.calls;
      const hasProtocolInfo = writeCalls.some(call => 
        typeof call[0] === 'string' && call[0].includes('Protocol: request test/method')
      );
      expect(hasProtocolInfo).toBe(true);
    });

    it('should include workflow information in console output', () => {
      logger = new Logger({ consoleOutput: true, fileOutput: false });
      
      logger.logWorkflow({
        phase: 'implementation',
        workingFiles: ['test.ts']
      });
      
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockWrite = process.stdout.write as MockedFunction<typeof process.stdout.write>;
      const writeCalls = mockWrite.mock.calls;
      const hasWorkflowInfo = writeCalls.some(call => 
        typeof call[0] === 'string' && call[0].includes('Workflow: implementation')
      );
      expect(hasWorkflowInfo).toBe(true);
    });
  });

  describe('file output', () => {
    it('should write logs to JSONL file', async () => {
      logger = new Logger({ 
        fileOutput: true, 
        logDir: testLogDir,
        consoleOutput: false 
      });
      
      logger.info('Test message');
      logger.close(); // Ensure file is flushed
      
      // Give the file system a moment to write
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const logPath = logger.getLogFilePath();
      expect(logPath).toBeTruthy();
      if (!logPath) {
        return;
      }
      expect(existsSync(logPath)).toBe(true);
      
      const content = readFileSync(logPath, 'utf-8');
      const logEntry = JSON.parse(content.trim()) as { [key: string]: unknown };
      
      expect(logEntry).toMatchObject({
        level: 'info',
        message: 'Test message',
        sessionId: logger.getSessionId(),
        sequenceNumber: 0
      });
    });

    it('should increment sequence numbers', async () => {
      logger = new Logger({ 
        fileOutput: true, 
        logDir: testLogDir,
        consoleOutput: false 
      });
      
      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');
      logger.close();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const logPath = logger.getLogFilePath();
      expect(logPath).toBeTruthy();
      if (!logPath) {
        return;
      }
      
      const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
      interface LogEntry {
        sequenceNumber: number;
        [key: string]: unknown;
      }
      const logs = lines.map(line => JSON.parse(line) as LogEntry);
      
      expect(logs[0]?.sequenceNumber).toBe(0);
      expect(logs[1]?.sequenceNumber).toBe(1);
      expect(logs[2]?.sequenceNumber).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should log Error objects properly', () => {
      logger = new Logger({ consoleOutput: true, fileOutput: false });
      
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      );
    });

    it('should handle non-Error objects in error field', () => {
      logger = new Logger({ consoleOutput: true, fileOutput: false });
      
      logger.error('Error occurred', 'String error');
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('String error')
      );
    });
  });

  describe('specialized logging methods', () => {
    it('should log protocol messages with timing', async () => {
      logger = new Logger({ 
        fileOutput: true, 
        logDir: testLogDir,
        consoleOutput: false 
      });
      
      const timing = {
        start: Date.now(),
        end: Date.now() + 100,
        duration: 100
      };
      
      logger.logProtocol({
        type: 'response',
        id: 123,
        result: { success: true }
      }, timing);
      
      logger.close();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const logPath = logger.getLogFilePath();
      expect(logPath).toBeTruthy();
      if (!logPath) {
        return;
      }
      
      const content = readFileSync(logPath, 'utf-8');
      interface LogEntry {
        protocol?: unknown;
        timing?: unknown;
      }
      const logEntry = JSON.parse(content.trim()) as LogEntry;
      
      expect(logEntry.protocol).toBeDefined();
      expect(logEntry.timing).toEqual(timing);
    });

    it('should log workflow with metadata', async () => {
      logger = new Logger({ 
        fileOutput: true, 
        logDir: testLogDir,
        consoleOutput: false 
      });
      
      const workflow = {
        phase: 'quality-check',
        previousPhase: 'implementation',
        workingFiles: ['src/index.ts', 'tests/index.test.ts']
      };
      
      const metadata = {
        lintPassed: true,
        testsPassed: false
      };
      
      logger.logWorkflow(workflow, metadata);
      logger.close();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const logPath = logger.getLogFilePath();
      expect(logPath).toBeTruthy();
      if (!logPath) {
        return;
      }
      
      const content = readFileSync(logPath, 'utf-8');
      interface LogEntry {
        workflow?: unknown;
        metadata?: unknown;
      }
      const logEntry = JSON.parse(content.trim()) as LogEntry;
      
      expect(logEntry.workflow).toEqual(workflow);
      expect(logEntry.metadata).toEqual(metadata);
    });
  });
});