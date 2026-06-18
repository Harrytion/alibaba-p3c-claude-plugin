import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { parsePmdXml, type PmdViolation, type PmdScanResult } from './rule-parser.js';

const execFileAsync = promisify(execFile);

export interface ScanOptions {
  /** File or directory paths to scan */
  paths: string[];
  /** Rule category paths (e.g., 'rulesets/java/ali-naming.xml') */
  rulesets: string[];
  /** Optional: minimum priority level (1=blocker, 2=critical, 3=major, 4=minor, 5=info) */
  minimumPriority?: number;
  /** Optional: encoding (default: UTF-8) */
  encoding?: string;
}

export class PmdRunner {
  private readonly jarPath: string;

  constructor(jarPath: string) {
    this.jarPath = jarPath;
  }

  async scan(options: ScanOptions): Promise<PmdScanResult> {
    if (!existsSync(this.jarPath)) {
      throw new Error(`P3C PMD JAR not found at: ${this.jarPath}. Run 'npm run download-pmd' first.`);
    }

    const rulesetArgs = options.rulesets.flatMap((rs) => ['-R', rs]);
    const pathArgs = options.paths.flatMap((p) => ['-d', p]);
    const args: string[] = [
      '-cp', this.jarPath,
      'net.sourceforge.pmd.PMD',
      ...pathArgs,
      ...rulesetArgs,
      '-f', 'xml',
      '-encoding', options.encoding ?? 'UTF-8',
    ];

    if (options.minimumPriority) {
      args.push('-min', String(options.minimumPriority));
    }

    try {
      const { stdout } = await execFileAsync('java', args, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 120_000,
      });

      return parsePmdXml(stdout);
    } catch (err: any) {
      // PMD exits with non-zero code when violations found — that's not an error
      // The stdout still contains the violation XML
      if (err.stdout) {
        return parsePmdXml(err.stdout);
      }
      throw new Error(`P3C PMD execution failed: ${err.message}`);
    }
  }
}
