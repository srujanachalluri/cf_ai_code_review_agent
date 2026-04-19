// src/types/agent.ts

export interface AnalysisResult {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  location?: { file: string; line: number; column: number };
  tags: string[];
}

export interface AnalysisOptions {
  language?: string;
  context?: string;
  focusAreas?: ('security' | 'performance' | 'style')[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Review {
  id: string;
  language: string;
  code: string;
  status: 'pending' | 'analyzing' | 'completed';
  createdAt: string;
  completedAt?: string;
}
