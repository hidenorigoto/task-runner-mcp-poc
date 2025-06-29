/**
 * Logger module exports
 */

export { Logger } from './Logger.js';
export {
  ANSI_COLORS,
  formatObject,
  formatTimestamp,
  getLogLevelColor,
  getLogLevelPriority,
  truncateString,
} from './utils.js';

// Re-export types from types/logger
export {
  LogLevel,
  type ComprehensiveLog,
  type LoggerOptions,
  type ProtocolMessage,
  type TimingInfo,
  type WorkflowLog,
} from '../types/logger.js';