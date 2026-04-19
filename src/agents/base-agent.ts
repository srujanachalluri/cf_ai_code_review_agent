// src/agents/base-agent.ts

import type { AnalysisResult, AnalysisOptions, Message } from '../types/agent';

export abstract class BaseCodeReviewAgent {
  protected agentName: string;
  protected agentType: 'security' | 'performance' | 'style';
  protected conversationHistory: Message[] = [];

  constructor(name: string, type: 'security' | 'performance' | 'style') {
    this.agentName = name;
    this.agentType = type;
  }

  abstract analyzeCode(code: string, options?: AnalysisOptions): Promise<AnalysisResult[]>;

  protected extractFunctions(code: string): string[] {
    const pattern = /(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
    const fns: string[] = [];
    let m;
    while ((m = pattern.exec(code)) !== null) fns.push(m[1] || m[2]);
    return fns;
  }

  protected estimateComplexity(code: string): number {
    let c = 1;
    ['if', 'else', 'switch', 'case', 'for', 'while', 'do'].forEach(kw => {
      const hits = code.match(new RegExp(`\\b${kw}\\b`, 'g'));
      if (hits) c += hits.length;
    });
    return Math.min(c, 10);
  }

  protected log(level: 'INFO' | 'ERROR', message: string, ctx?: Record<string, unknown>) {
    const entry = { level, timestamp: new Date().toISOString(), agent: this.agentName, message, ...ctx };
    level === 'ERROR' ? console.error(JSON.stringify(entry)) : console.log(JSON.stringify(entry));
  }
}
