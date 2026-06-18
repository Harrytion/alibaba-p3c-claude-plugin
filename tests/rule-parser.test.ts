import { describe, it, expect } from 'vitest';
import { parsePmdXml } from '../src/services/rule-parser.js';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<pmd version="6.15.0" timestamp="2024-01-01T00:00:00.000">
  <file name="/src/main/java/com/example/BadNaming.java">
    <violation beginline="3" endline="3" begincolumn="1" endcolumn="20"
      rule="ClassNamingShouldBeCamelRule" ruleset="AlibabaJavaNaming"
      class="com.alibaba.p3c.pmd.lang.java.rule.naming.ClassNamingShouldBeCamelRule"
      priority="3">
      Class name should be in CamelCase style
    </violation>
    <violation beginline="5" endline="5" begincolumn="4" endcolumn="30"
      rule="ConstantFieldShouldBeUpperCaseRule" ruleset="AlibabaJavaNaming"
      class="com.alibaba.p3c.pmd.lang.java.rule.naming.ConstantFieldShouldBeUpperCaseRule"
      priority="2">
      Constant variable name should be upper case
    </violation>
  </file>
</pmd>`;

describe('parsePmdXml', () => {
  it('should parse PMD XML output into structured violations', () => {
    const result = parsePmdXml(SAMPLE_XML);

    expect(result.violations).toHaveLength(2);
    expect(result.violations[0]).toEqual({
      file: '/src/main/java/com/example/BadNaming.java',
      beginLine: 3,
      endLine: 3,
      beginColumn: 1,
      endColumn: 20,
      rule: 'ClassNamingShouldBeCamelRule',
      ruleset: 'AlibabaJavaNaming',
      priority: 3,
      message: 'Class name should be in CamelCase style',
    });
    expect(result.violations[1].rule).toBe('ConstantFieldShouldBeUpperCaseRule');
  });

  it('should return empty violations for empty XML', () => {
    const result = parsePmdXml('<?xml version="1.0"?><pmd version="6.15.0"></pmd>');
    expect(result.violations).toHaveLength(0);
  });

  it('should handle XML with no files', () => {
    const result = parsePmdXml('<?xml version="1.0"?><pmd version="6.15.0"><file name="test.java"></file></pmd>');
    expect(result.violations).toHaveLength(0);
  });
});
