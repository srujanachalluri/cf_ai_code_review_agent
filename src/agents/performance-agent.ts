// src/agents/performance-agent.ts

import { BaseCodeReviewAgent } from './base-agent';
import type { AnalysisResult, AnalysisOptions } from '../types/agent';

export class PerformanceAgent extends BaseCodeReviewAgent {
  constructor() {
    super('PerformanceAgent', 'performance');
  }

  async analyzeCode(code: string, options?: AnalysisOptions): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    const lines = code.split('\n');

    lines.forEach((line, i) => {
      const loc = { file: options?.context || 'unknown', line: i + 1, column: 0 };

      // Nested loops → O(n²) or worse
      const loopMatches = line.match(/\b(?:for|while)\b/g);
      if (loopMatches && loopMatches.length >= 2) {
        results.push({ id: crypto.randomUUID(), type: 'performance', severity: 'warning', title: 'Nested Loops (O(n²))', description: 'Multiple loops on one line suggest nested iteration and quadratic complexity', recommendation: 'Consider hash maps or Set lookups to reduce to O(n)', location: loc, tags: ['performance', 'complexity'] });
      }

      // Array length in loop condition
      if (/for\s*\(.*;\s*\w+\s*<\s*\w+\.length\s*;/i.test(line)) {
        results.push({ id: crypto.randomUUID(), type: 'performance', severity: 'info', title: 'Array Length in Loop Condition', description: '.length re-evaluated on every iteration', recommendation: 'Cache length: const len = arr.length; before the loop', location: loc, tags: ['performance', 'optimization'] });
      }

      // Potential memory leak: addEventListener without cleanup
      if (/addEventListener/.test(line) && !code.includes('removeEventListener')) {
        results.push({ id: crypto.randomUUID(), type: 'performance', severity: 'warning', title: 'Potential Memory Leak', description: 'addEventListener found but no removeEventListener in this file', recommendation: 'Always remove event listeners in cleanup/unmount functions', location: loc, tags: ['performance', 'memory'] });
      }

      // N+1: DB query inside a loop
      if (/\b(?:for|forEach|while|map)\b/.test(line)) {
        const nextFew = lines.slice(i + 1, i + 4).join(' ');
        if (/\.(?:find|findOne|query|select|where)\s*\(/.test(nextFew)) {
          results.push({ id: crypto.randomUUID(), type: 'performance', severity: 'high', title: 'N+1 Query Problem', description: 'Database query detected inside a loop — causes N+1 queries', recommendation: 'Fetch all records before the loop, or use JOIN / batch query', location: loc, tags: ['performance', 'database'] });
        }
      }

      // Inline arrow function in JSX
      if (/onClick\s*=\s*\{.*=>/i.test(line)) {
        results.push({ id: crypto.randomUUID(), type: 'performance', severity: 'info', title: 'Inline Function in JSX', description: 'Arrow function created on every render', recommendation: 'Extract to useCallback or define outside the component', location: loc, tags: ['performance', 'react'] });
      }

      // Synchronous file/network ops
      if (/(?:readFileSync|writeFileSync|execSync)\s*\(/i.test(line)) {
        results.push({ id: crypto.randomUUID(), type: 'performance', severity: 'warning', title: 'Synchronous I/O Detected', description: 'Synchronous operations block the event loop', recommendation: 'Use the async equivalent (readFile, writeFile, exec)', location: loc, tags: ['performance', 'blocking'] });
      }
    });

    this.log('INFO', 'Performance analysis complete', { issues: results.length });
    return results;
  }

  estimateComplexityLabel(code: string): string {
    const loops = (code.match(/\b(?:for|while|forEach)\b/g) || []).length;
    if (loops === 0) return 'O(1) — Constant';
    if (loops === 1) return 'O(n) — Linear';
    if (loops === 2) return 'O(n²) — Quadratic';
    return `O(n^${loops}) — Polynomial`;
  }
}
