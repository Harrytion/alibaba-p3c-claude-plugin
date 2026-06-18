import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface JavaProjectInfo {
  isJava: boolean;
  buildTool?: 'maven' | 'gradle';
  details: string;
  hasJavaFiles: boolean;
}

export function detectJavaProject(projectRoot: string): JavaProjectInfo {
  const hasPomXml = existsSync(join(projectRoot, 'pom.xml'));
  const hasBuildGradle = existsSync(join(projectRoot, 'build.gradle'))
    || existsSync(join(projectRoot, 'build.gradle.kts'));

  // Quick recursive check for Java source files
  let hasJavaFiles = false;
  try {
    hasJavaFiles = hasJavaFilesRecursive(projectRoot, 0);
  } catch {
    // Directory may not be readable, ignore
  }

  if (hasPomXml) {
    return { isJava: true, buildTool: 'maven', details: 'Maven 项目', hasJavaFiles };
  }
  if (hasBuildGradle) {
    return { isJava: true, buildTool: 'gradle', details: 'Gradle 项目', hasJavaFiles };
  }
  if (hasJavaFiles) {
    return { isJava: true, details: '包含 Java 源文件（未检测到构建工具）', hasJavaFiles };
  }

  return { isJava: false, details: '未检测到 Java 项目特征（无 pom.xml / build.gradle / .java 文件）', hasJavaFiles: false };
}

/**
 * Recursively check for .java files, with depth limit to avoid scanning huge trees
 */
function hasJavaFilesRecursive(dir: string, depth: number): boolean {
  if (depth > 5) return false; // Don't scan deeper than 5 levels

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.git') continue;
      if (entry.isFile() && entry.name.endsWith('.java')) return true;
      if (entry.isDirectory()) {
        if (hasJavaFilesRecursive(join(dir, entry.name), depth + 1)) return true;
      }
    }
  } catch {
    // Permission denied or other errors, skip
  }
  return false;
}
