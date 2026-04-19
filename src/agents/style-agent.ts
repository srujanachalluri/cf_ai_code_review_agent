// src/agents/style-agent.ts

import { BaseCodeReviewAgent } from './base-agent';
import type { AnalysisResult, AnalysisOptions } from '../types/agent';

export class StyleAgent extends BaseCodeReviewAgent {
  constructor() {
    super('StyleAgent', 'style');
  }

  async analyzeCode(code: string, options?: AnalysisOptions): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    const lines = code.split('\n');

    lines.forEach((line, i) => {
      const loc = { file: options?.context || 'unknown', line: i + 1, column: 0 };
      const trimmed = line.trimStart();

      // Skip comment lines
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

      // Line too long
      if (line.length > 100) {
        results.push({ id: crypto.randomUUID(), type: 'style', severity: 'info', title: 'Line Too Long', description: `Line ${i + 1} is ${line.length} chars (limit: 100)`, recommendation: 'Break into multiple lines for readability', location: loc, tags: ['style', 'readability'] });
      }

      // Deep nesting (7+ spaces of indent = 3+ levels)
      if (/^(  ){4,}/.test(line) && trimmed.length > 0) {
        results.push({ id: crypto.randomUUID(), type: 'style', severity: 'warning', title: 'Deep Nesting', description: 'Code is deeply nested — hard to read and test', recommendation: 'Extract logic into helper functions or use early returns', location: loc, tags: ['style', 'complexity'] });
      }

      // Single-letter variable (not i/j/k loop counters)
      const singleLetterVar = line.match(/(?:const|let|var)\s+([a-hm-z])\s*=/);
      if (singleLetterVar) {
        results.push({ id: crypto.randomUUID(), type: 'style', severity: 'info', title: 'Single-Letter Variable', description: `"${singleLetterVar[1]}" is not descriptive`, recommendation: 'Use a meaningful name that explains what this value represents', location: loc, tags: ['style', 'naming'] });
      }

      // Magic numbers
      const magicNum = line.match(/[^a-zA-Z_'"]((?:[2-9]|\d{2,}))\b/);
      if (magicNum && !line.includes('const ') && !/(?:px|em|rem|ms|vh|vw)/.test(line)) {
        results.push({ id: crypto.randomUUID(), type: 'style', severity: 'info', title: 'Magic Number', description: `Hard-coded number ${magicNum[1]} without explanation`, recommendation: `Replace with a named constant: const MAX_ITEMS = ${magicNum[1]};`, location: loc, tags: ['style', 'maintainability'] });
      }

      // TODO/FIXME/HACK comments
      if (/\b(?:TODO|FIXME|HACK|XXX)\b/.test(line)) {
        results.push({ id: crypto.randomUUID(), type: 'style', severity: 'info', title: 'Unresolved TODO/FIXME', description: 'Technical debt marker found', recommendation: 'Resolve or create a tracking ticket for this item', location: loc, tags: ['style', 'debt'] });
      }

      // console.log left in (not in test files)
      if (/console\.log\s*\(/.test(line) && !(options?.context || '').includes('test')) {
        results.push({ id: crypto.randomUUID(), type: 'style', severity: 'info', title: 'console.log in Production Code', description: 'Debug log statement left in code', recommendation: 'Remove or replace with a proper logger', location: loc, tags: ['style', 'debugging'] });
      }
    });

    // File-level checks
    const fnCount = (code.match(/(?:function\s+\w+|=>\s*\{)/g) || []).length;
    const commentCount = (code.match(/\/\/|\/\*/g) || []).length;
    if (fnCount > 3 && commentCount < fnCount / 2) {
      results.push({ id: crypto.randomUUID(), type: 'style', severity: 'info', title: 'Low Comment Ratio', description: `${fnCount} functions found but few comments`, recommendation: 'Add JSDoc comments to explain function purpose and params', tags: ['style', 'documentation'] });
    }

    this.log('INFO', 'Style analysis complete', { issues: results.length });
    return results;
  }
}
