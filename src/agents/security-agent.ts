// src/agents/security-agent.ts

import { BaseCodeReviewAgent } from './base-agent';
import type { AnalysisResult, AnalysisOptions } from '../types/agent';

interface SecurityPattern {
  name: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  pattern: RegExp;
  description: string;
  remediation: string;
}

export class SecurityAgent extends BaseCodeReviewAgent {
  private patterns: SecurityPattern[] = [
    { name: 'SQL Injection', severity: 'critical', pattern: /query\s*\(`.*\$\{|\.query\s*\(\s*["'`][^"'`]*\$\{/i, description: 'Dynamic SQL query with user input detected', remediation: 'Use parameterized queries or prepared statements' },
    { name: 'eval() Usage', severity: 'critical', pattern: /\beval\s*\(/, description: 'eval() executes arbitrary code — major injection risk', remediation: 'Remove eval(). Use JSON.parse() or safer alternatives' },
    { name: 'Hardcoded Secret', severity: 'critical', pattern: /(?:password|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{4,}["']/i, description: 'Hardcoded credential or secret detected', remediation: 'Move secrets to environment variables' },
    { name: 'XSS via innerHTML', severity: 'critical', pattern: /\.innerHTML\s*=|dangerouslySetInnerHTML/, description: 'Potential XSS via direct HTML injection', remediation: 'Use textContent or sanitize with DOMPurify' },
    { name: 'Command Injection', severity: 'critical', pattern: /(?:exec|execSync|spawn)\s*\([^)]*(?:req\.|user|input)/i, description: 'Shell command built from user input', remediation: 'Never pass user input to shell commands' },
    { name: 'Weak Cryptography', severity: 'high', pattern: /\b(?:md5|sha1|createCipher)\s*\(/i, description: 'Weak or deprecated cryptographic algorithm', remediation: 'Use SHA-256 or AES-GCM instead' },
    { name: 'Sensitive Data in Log', severity: 'high', pattern: /console\.(?:log|info|debug)\s*\([^)]*(?:password|token|secret|key)/i, description: 'Sensitive data may be logged', remediation: 'Never log passwords, tokens, or secrets' },
    { name: 'Overly Permissive CORS', severity: 'warning', pattern: /Access-Control-Allow-Origin['":\s]+\*/i, description: 'CORS allows all origins', remediation: 'Restrict CORS to specific trusted domains' },
    { name: 'Missing Input Validation', severity: 'warning', pattern: /(?:req\.body|req\.query|req\.params)\.\w+[^;]*(?:INSERT|SELECT|DELETE|UPDATE)/i, description: 'User input used directly in database query', remediation: 'Validate and sanitize all user inputs' },
    { name: 'Prototype Pollution', severity: 'high', pattern: /\[\s*['"]__proto__['"]\s*\]|Object\.assign\s*\(\s*{}\s*,\s*(?:req|user)/i, description: 'Potential prototype pollution vulnerability', remediation: 'Validate object keys, use Object.create(null)' },
  ];

  constructor() {
    super('SecurityAgent', 'security');
  }

  async analyzeCode(code: string, options?: AnalysisOptions): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    const lines = code.split('\n');

    for (const pat of this.patterns) {
      lines.forEach((line, i) => {
        if (pat.pattern.test(line)) {
          results.push({
            id: crypto.randomUUID(),
            type: 'security',
            severity: pat.severity,
            title: pat.name,
            description: pat.description,
            recommendation: pat.remediation,
            location: { file: options?.context || 'unknown', line: i + 1, column: 0 },
            tags: ['security']
          });
        }
      });
    }

    this.log('INFO', 'Security analysis complete', { issues: results.length });
    return results;
  }

  generateReport(results: AnalysisResult[]) {
    const critical = results.filter(r => r.severity === 'critical').length;
    const high = results.filter(r => r.severity === 'high').length;
    const score = Math.max(0, 100 - critical * 25 - high * 10 - results.length * 2);
    return {
      score,
      riskLevel: critical > 0 ? 'critical' : high > 0 ? 'high' : results.length > 0 ? 'warning' : 'low',
      findings: results
    };
  }
}
