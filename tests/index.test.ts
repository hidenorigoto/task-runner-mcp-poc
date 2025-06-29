import { describe, it, expect } from 'vitest';

describe('MCP Server Module', () => {
  describe('Module Structure', () => {
    it('should export main function', async () => {
      const module = await import('../src/index.js');
      expect(module.main).toBeTypeOf('function');
    });

    it('should be importable without errors', async () => {
      await expect(import('../src/index.js')).resolves.toBeDefined();
    });
  });

  describe('Tool Integration', () => {
    it('should import task tools successfully', async () => {
      const { taskTools } = await import('../src/tools/index.js');
      expect(taskTools).toBeDefined();
      expect(Array.isArray(taskTools)).toBe(true);
      expect(taskTools.length).toBeGreaterThan(0);
    });

    it('should import logger successfully', async () => {
      const { Logger } = await import('../src/logger/index.js');
      expect(Logger).toBeDefined();
      expect(Logger).toBeTypeOf('function');
    });
  });
});