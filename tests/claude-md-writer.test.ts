import { describe, it, expect } from 'vitest';
import { generateClaudeMdSection, parseClaudeMdSection } from '../src/services/claude-md-writer.js';

describe('generateClaudeMdSection', () => {
  it('should generate CLAUDE.md P3C section with enabled rules', () => {
    const config = {
      enabledCategories: [
        { name: '命名规约', ruleset: 'ali-naming', levels: ['mandatory', 'recommended'] },
        { name: '注释规约', ruleset: 'ali-comment', levels: ['mandatory'] },
        { name: '并发规约', ruleset: 'ali-concurrent', levels: ['mandatory'] },
      ],
      hooks: {
        postWrite: true,
        preCommit: false,
      },
      scanPaths: ['src/main/java/**/*.java'],
    };

    const section = generateClaudeMdSection(config);

    expect(section).toContain('## Alibaba P3C Java Coding Guidelines');
    expect(section).toContain('命名规约');
    expect(section).toContain('注释规约');
    expect(section).toContain('并发规约');
    expect(section).toContain('Post-Write');
    expect(section).toContain('src/main/java/**/*.java');
    expect(section).toContain('/p3c-scan');
    expect(section).toContain('/p3c-review');
  });

  it('should generate section with no hooks', () => {
    const config = {
      enabledCategories: [
        { name: 'OOP规约', ruleset: 'ali-oop', levels: ['mandatory'] },
      ],
      hooks: {
        postWrite: false,
        preCommit: false,
      },
      scanPaths: ['**/*.java'],
    };

    const section = generateClaudeMdSection(config);
    expect(section).toContain('OOP规约');
    expect(section).not.toContain('Post-Write');
    expect(section).not.toContain('Pre-Commit');
  });
});

describe('parseClaudeMdSection', () => {
  it('should detect existing P3C section in CLAUDE.md', () => {
    const content = `# Project Notes\n\n## Alibaba P3C Java Coding Guidelines\n\nSome config here\n\n## Other Section`;
    const result = parseClaudeMdSection(content);
    expect(result.hasSection).toBe(true);
    expect(result.startIndex).toBeGreaterThanOrEqual(0);
  });

  it('should return no section for CLAUDE.md without P3C', () => {
    const content = `# Project Notes\n\n## Other Section\n\nHello`;
    const result = parseClaudeMdSection(content);
    expect(result.hasSection).toBe(false);
  });
});
