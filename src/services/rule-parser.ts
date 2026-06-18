import { XMLParser } from 'fast-xml-parser';

export interface PmdViolation {
  file: string;
  beginLine: number;
  endLine: number;
  beginColumn: number;
  endColumn: number;
  rule: string;
  ruleset: string;
  priority: number;
  message: string;
}

export interface PmdScanResult {
  violations: PmdViolation[];
  fileCount: number;
  violationCount: number;
}

export function parsePmdXml(xmlString: string): PmdScanResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '#text',
    isArray: (name) => name === 'violation' || name === 'file',
  });

  const parsed = parser.parse(xmlString);
  const pmd = parsed.pmd;

  if (!pmd || !pmd.file) {
    return { violations: [], fileCount: 0, violationCount: 0 };
  }

  const files = Array.isArray(pmd.file) ? pmd.file : [pmd.file];
  const violations: PmdViolation[] = [];

  for (const file of files) {
    if (!file.violation) continue;

    const fileViolations = Array.isArray(file.violation) ? file.violation : [file.violation];

    for (const v of fileViolations) {
      violations.push({
        file: file.name,
        beginLine: parseInt(v.beginline, 10),
        endLine: parseInt(v.endline, 10),
        beginColumn: parseInt(v.begincolumn, 10),
        endColumn: parseInt(v.endcolumn, 10),
        rule: v.rule,
        ruleset: v.ruleset,
        priority: parseInt(v.priority, 10),
        message: (v['#text'] ?? '').trim(),
      });
    }
  }

  return {
    violations,
    fileCount: files.length,
    violationCount: violations.length,
  };
}
