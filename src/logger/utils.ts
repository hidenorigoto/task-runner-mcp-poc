/**
 * Logger utility functions
 */

import { LogLevel } from '../types/logger.js';

/**
 * Get numeric priority for log level
 */
export function getLogLevelPriority(level: LogLevel): number {
  const priorities: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };
  return priorities[level];
}

/**
 * Format timestamp for console output
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const millis = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

/**
 * Truncate long strings for console output
 */
export function truncateString(str: string, maxLength: number = 80): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * ANSI color codes for console output
 */
export const ANSI_COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const;

/**
 * Get color for log level
 */
export function getLogLevelColor(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: ANSI_COLORS.cyan,
    [LogLevel.INFO]: ANSI_COLORS.green,
    [LogLevel.WARN]: ANSI_COLORS.yellow,
    [LogLevel.ERROR]: ANSI_COLORS.red,
  };
  return colors[level];
}

/**
 * Format object for pretty console output
 */
export function formatObject(obj: unknown, indent: number = 2): string {
  try {
    const result = JSON.stringify(obj, null, indent);
    // JSON.stringify returns undefined for undefined values
    return result === undefined ? String(obj) : result;
  } catch {
    return String(obj);
  }
}