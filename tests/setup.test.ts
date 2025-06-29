import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Project Setup', () => {
  it('should have required configuration files', () => {
    const projectRoot = process.cwd();
    
    // Check for essential configuration files
    expect(existsSync(join(projectRoot, 'package.json'))).toBe(true);
    expect(existsSync(join(projectRoot, 'tsconfig.json'))).toBe(true);
    expect(existsSync(join(projectRoot, 'eslint.config.js'))).toBe(true);
    expect(existsSync(join(projectRoot, '.prettierrc'))).toBe(true);
    expect(existsSync(join(projectRoot, 'vitest.config.ts'))).toBe(true);
  });

  it('should have required directory structure', () => {
    const projectRoot = process.cwd();
    
    // Check for essential directories
    expect(existsSync(join(projectRoot, 'src'))).toBe(true);
    expect(existsSync(join(projectRoot, 'src/workflow'))).toBe(true);
    expect(existsSync(join(projectRoot, 'src/tools'))).toBe(true);
    expect(existsSync(join(projectRoot, 'src/logger'))).toBe(true);
    expect(existsSync(join(projectRoot, 'src/types'))).toBe(true);
    expect(existsSync(join(projectRoot, 'tests'))).toBe(true);
    expect(existsSync(join(projectRoot, 'logs'))).toBe(true);
  });

  it('should have entry point file', () => {
    const projectRoot = process.cwd();
    expect(existsSync(join(projectRoot, 'src/index.ts'))).toBe(true);
  });
});