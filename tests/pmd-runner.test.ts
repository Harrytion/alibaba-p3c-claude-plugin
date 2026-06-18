import { describe, it, expect, beforeAll } from 'vitest';
import { PmdRunner } from '../src/services/pmd-runner.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = join(import.meta.dirname, '..');
const JAR_PATH = join(PROJECT_ROOT, 'lib', 'p3c-pmd-2.1.1-jar-with-dependencies.jar');
const FIXTURE_DIR = join(PROJECT_ROOT, 'tests', 'fixtures');

const jarExists = existsSync(JAR_PATH);

describe.skipIf(!jarExists)('PmdRunner', () => {
  let runner: PmdRunner;

  beforeAll(() => {
    runner = new PmdRunner(JAR_PATH);
  });

  it('should scan a Java file and return violations', async () => {
    const javaFile = join(FIXTURE_DIR, 'BadNaming.java');
    const result = await runner.scan({
      paths: [javaFile],
      rulesets: ['rulesets/java/ali-naming.xml'],
    });

    expect(result).toBeDefined();
    expect(result.violations).toBeInstanceOf(Array);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should return structured violation data', async () => {
    const javaFile = join(FIXTURE_DIR, 'BadNaming.java');
    const result = await runner.scan({
      paths: [javaFile],
      rulesets: ['rulesets/java/ali-naming.xml'],
    });

    const v = result.violations[0];
    expect(v).toHaveProperty('file');
    expect(v).toHaveProperty('beginLine');
    expect(v).toHaveProperty('rule');
    expect(v).toHaveProperty('message');
  });

  it('should throw if JAR path is invalid', async () => {
    const badRunner = new PmdRunner('/nonexistent/p3c-pmd.jar');
    await expect(badRunner.scan({ paths: ['/tmp/Fake.java'], rulesets: ['rulesets/java/ali-naming.xml'] }))
      .rejects.toThrow();
  });
});
