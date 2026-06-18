import { describe, it, expect } from 'vitest';
import { detectJavaProject } from '../src/services/java-detector.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('detectJavaProject', () => {
  it('should detect Maven project', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'p3c-test-'));
    writeFileSync(join(tmpDir, 'pom.xml'), '<project></project>');

    const result = detectJavaProject(tmpDir);
    expect(result.isJava).toBe(true);
    expect(result.buildTool).toBe('maven');

    rmSync(tmpDir, { recursive: true });
  });

  it('should detect Gradle project', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'p3c-test-'));
    writeFileSync(join(tmpDir, 'build.gradle'), '');

    const result = detectJavaProject(tmpDir);
    expect(result.isJava).toBe(true);
    expect(result.buildTool).toBe('gradle');

    rmSync(tmpDir, { recursive: true });
  });

  it('should detect Gradle Kotlin DSL project', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'p3c-test-'));
    writeFileSync(join(tmpDir, 'build.gradle.kts'), '');

    const result = detectJavaProject(tmpDir);
    expect(result.isJava).toBe(true);
    expect(result.buildTool).toBe('gradle');

    rmSync(tmpDir, { recursive: true });
  });

  it('should reject non-Java project', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'p3c-test-'));
    writeFileSync(join(tmpDir, 'package.json'), '{}');

    const result = detectJavaProject(tmpDir);
    expect(result.isJava).toBe(false);

    rmSync(tmpDir, { recursive: true });
  });
});
