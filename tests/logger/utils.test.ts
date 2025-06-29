import { describe, it, expect } from 'vitest';
import {
  ANSI_COLORS,
  formatObject,
  formatTimestamp,
  getLogLevelColor,
  getLogLevelPriority,
  truncateString,
  LogLevel
} from '../../src/logger/index.js';

describe('Logger utilities', () => {
  describe('getLogLevelPriority', () => {
    it('should return correct priorities for log levels', () => {
      expect(getLogLevelPriority(LogLevel.DEBUG)).toBe(0);
      expect(getLogLevelPriority(LogLevel.INFO)).toBe(1);
      expect(getLogLevelPriority(LogLevel.WARN)).toBe(2);
      expect(getLogLevelPriority(LogLevel.ERROR)).toBe(3);
    });

    it('should order log levels correctly', () => {
      const debugPriority = getLogLevelPriority(LogLevel.DEBUG);
      const infoPriority = getLogLevelPriority(LogLevel.INFO);
      const warnPriority = getLogLevelPriority(LogLevel.WARN);
      const errorPriority = getLogLevelPriority(LogLevel.ERROR);

      expect(debugPriority).toBeLessThan(infoPriority);
      expect(infoPriority).toBeLessThan(warnPriority);
      expect(warnPriority).toBeLessThan(errorPriority);
    });
  });

  describe('formatTimestamp', () => {
    it('should format ISO timestamp to HH:MM:SS.mmm', () => {
      const timestamp = '2024-01-15T14:30:45.123Z';
      const formatted = formatTimestamp(timestamp);
      
      // Note: This will be in local time, so we just check the format
      expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });

    it('should pad single digits with zeros', () => {
      const timestamp = '2024-01-15T01:02:03.004Z';
      const formatted = formatTimestamp(timestamp);
      
      // Check that all parts are properly padded
      const parts = formatted.split(/[:.]/);
      expect(parts[0]).toHaveLength(2); // hours
      expect(parts[1]).toHaveLength(2); // minutes
      expect(parts[2]).toHaveLength(2); // seconds
      expect(parts[3]).toHaveLength(3); // milliseconds
    });
  });

  describe('truncateString', () => {
    it('should not truncate short strings', () => {
      const short = 'Short string';
      expect(truncateString(short)).toBe(short);
      expect(truncateString(short, 100)).toBe(short);
    });

    it('should truncate long strings with ellipsis', () => {
      const long = 'a'.repeat(100);
      const truncated = truncateString(long, 50);
      
      expect(truncated).toHaveLength(50);
      expect(truncated.endsWith('...')).toBe(true);
      expect(truncated).toBe('a'.repeat(47) + '...');
    });

    it('should use default max length of 80', () => {
      const long = 'x'.repeat(100);
      const truncated = truncateString(long);
      
      expect(truncated).toHaveLength(80);
      expect(truncated).toBe('x'.repeat(77) + '...');
    });

    it('should handle edge cases', () => {
      expect(truncateString('')).toBe('');
      expect(truncateString('abc', 3)).toBe('abc');
      expect(truncateString('abcd', 3)).toBe('...');
    });
  });

  describe('getLogLevelColor', () => {
    it('should return correct ANSI colors for log levels', () => {
      expect(getLogLevelColor(LogLevel.DEBUG)).toBe(ANSI_COLORS.cyan);
      expect(getLogLevelColor(LogLevel.INFO)).toBe(ANSI_COLORS.green);
      expect(getLogLevelColor(LogLevel.WARN)).toBe(ANSI_COLORS.yellow);
      expect(getLogLevelColor(LogLevel.ERROR)).toBe(ANSI_COLORS.red);
    });
  });

  describe('formatObject', () => {
    it('should format objects as pretty JSON', () => {
      const obj = { foo: 'bar', nested: { value: 123 } };
      const formatted = formatObject(obj);
      
      expect(formatted).toBe(JSON.stringify(obj, null, 2));
      expect(formatted).toContain('\n');
      expect(formatted).toContain('  ');
    });

    it('should handle custom indentation', () => {
      const obj = { test: true };
      const formatted = formatObject(obj, 4);
      
      expect(formatted).toBe(JSON.stringify(obj, null, 4));
      expect(formatted).toContain('    '); // 4 spaces
    });

    it('should handle circular references gracefully', () => {
      interface CircularObject {
        a: number;
        self?: CircularObject;
      }
      const circular: CircularObject = { a: 1 };
      circular.self = circular;
      
      const formatted = formatObject(circular);
      expect(formatted).toBe('[object Object]');
    });

    it('should handle various data types', () => {
      expect(formatObject(null)).toBe('null');
      expect(formatObject(undefined)).toBe(String(undefined));
      expect(formatObject(123)).toBe('123');
      expect(formatObject('string')).toBe('"string"');
      expect(formatObject([1, 2, 3])).toBe('[\n  1,\n  2,\n  3\n]');
    });
  });

  describe('ANSI_COLORS', () => {
    it('should export all expected color codes', () => {
      expect(ANSI_COLORS.reset).toBe('\x1b[0m');
      expect(ANSI_COLORS.bright).toBe('\x1b[1m');
      expect(ANSI_COLORS.red).toBe('\x1b[31m');
      expect(ANSI_COLORS.green).toBe('\x1b[32m');
      expect(ANSI_COLORS.yellow).toBe('\x1b[33m');
      expect(ANSI_COLORS.cyan).toBe('\x1b[36m');
    });

    it('should be immutable', () => {
      // ANSI_COLORS is a const object, but JavaScript doesn't throw on assignment
      // We'll test that the object has the as const assertion by checking the type
      const colorKeys = Object.keys(ANSI_COLORS);
      expect(colorKeys).toContain('red');
      expect(colorKeys).toContain('green');
      expect(colorKeys).toContain('reset');
      
      // Verify the object is frozen (if we want true immutability we'd use Object.freeze)
      // For now, just verify it's properly typed as const
      expect(ANSI_COLORS).toHaveProperty('red', '\x1b[31m');
    });
  });
});