// src/index.ts — Cloudflare Worker entry point

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { SecurityAgent } from './agents/security-agent';
import { PerformanceAgent } from './agents/performance-agent';
import { StyleAgent } from './agents/style-agent';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Env {
  KV?: KVNamespace;
}

// ─── Validation ───────────────────────────────────────────────────────────────
const ReviewSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50_000, 'Code exceeds 50,000 character limit'),
  language: z.string().default('javascript'),
  context: z.string().optional(),
  focusAreas: z.array(z.enum(['security', 'performance', 'style'])).optional(),
});

// ─── Agent singletons (stateless — created per isolate) ──────────────────────
const securityAgent  = new SecurityAgent();
const performanceAgent = new PerformanceAgent();
const styleAgent     = new StyleAgent();

// ─── App ──────────────────────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'] }));

// Request logger
app.use(async (c, next) => {
  const start = Date.now();
  await next();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Date.now() - start,
  }));
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Health check */
app.get('/health', c => c.json({ status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' }));

/** System capabilities */
app.get('/api/stats', c => c.json({
  status: 'success',
  agents: ['security', 'performance', 'style'],
  checks: {
    security:    ['SQL Injection', 'eval() Usage', 'Hardcoded Secrets', 'XSS', 'Command Injection', 'Weak Crypto', 'CORS Misconfiguration', 'Prototype Pollution'],
    performance: ['Nested Loops (O(n²))', 'N+1 Queries', 'Memory Leaks', 'Sync I/O', 'Inline JSX Functions', 'Array .length in Loop'],
    style:       ['Line Length', 'Deep Nesting', 'Magic Numbers', 'Single-Letter Variables', 'TODO/FIXME', 'Missing Comments'],
  },
}));

/** Full code review — runs all 3 agents in parallel */
app.post('/api/review', async c => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ status: 'error', message: 'Invalid JSON body' }, 400); }

  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return c.json({ status: 'error', message: 'Validation failed', details: parsed.error.errors }, 400);

  const { code, language, context, focusAreas } = parsed.data;
  const opts = { language, context };
  const id = crypto.randomUUID();
  const ts  = new Date().toISOString();

  const wanted = focusAreas ?? ['security', 'performance', 'style'];

  const [secRes, perfRes, styleRes] = await Promise.all([
    wanted.includes('security')    ? securityAgent.analyzeCode(code, opts)    : Promise.resolve([]),
    wanted.includes('performance') ? performanceAgent.analyzeCode(code, opts) : Promise.resolve([]),
    wanted.includes('style')       ? styleAgent.analyzeCode(code, opts)       : Promise.resolve([]),
  ]);

  const score = (issues: typeof secRes, critW = 20, warnW = 5) =>
    Math.max(0, 100 - issues.filter(i => i.severity === 'critical').length * critW
                    - issues.filter(i => i.severity === 'high').length    * 10
                    - issues.filter(i => i.severity === 'warning').length  * warnW);

  const secScore   = score(secRes, 25, 8);
  const perfScore  = score(perfRes, 20, 5);
  const styleScore = score(styleRes, 0, 3);
  const overall    = Math.round((secScore + perfScore + styleScore) / 3);

  const allIssues = [...secRes, ...perfRes, ...styleRes];
  const critical  = allIssues.filter(i => i.severity === 'critical').length;

  // Persist to KV (best-effort — don't fail the request if KV is unavailable)
  try {
    await c.env.KV?.put(`review:${id}`, JSON.stringify({
      id, ts, language, scores: { security: secScore, performance: perfScore, style: styleScore, overall },
      summary: { total: allIssues.length, critical, warnings: allIssues.filter(i => i.severity === 'warning').length },
    }), { expirationTtl: 86_400 });
  } catch (e) {
    console.warn('KV write skipped (local dev):', e);
  }

  return c.json({
    id, status: 'completed', timestamp: ts, language,
    analyses: {
      security:    { score: secScore,   issues: secRes.length,   findings: secRes   },
      performance: { score: perfScore,  issues: perfRes.length,  findings: perfRes  },
      style:       { score: styleScore, issues: styleRes.length, findings: styleRes },
    },
    summary: { total: allIssues.length, critical, overall },
    complexity: performanceAgent.estimateComplexityLabel(code),
  });
});

/** Retrieve a cached review */
app.get('/api/review/:id', async c => {
  try {
   const data = await c.env.KV?.get(`review:${c.req.param('id')}`);
    if (!data) return c.json({ status: 'error', message: 'Review not found (KV not configured)' }, 404);
    return c.json(JSON.parse(data));
  } catch {
    return c.json({ status: 'error', message: 'Could not retrieve review (KV unavailable in local dev)' }, 503);
  }
});

/** Security-only analysis */
app.post('/api/security-analysis', async c => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  if (!body?.code) return c.json({ error: 'code is required' }, 400);
  const findings = await securityAgent.analyzeCode(body.code, { context: body.context });
  return c.json({ status: 'success', timestamp: new Date().toISOString(), ...securityAgent.generateReport(findings) });
});

/** Performance-only analysis */
app.post('/api/performance-analysis', async c => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  if (!body?.code) return c.json({ error: 'code is required' }, 400);
  const findings = await performanceAgent.analyzeCode(body.code, { context: body.context });
  return c.json({ status: 'success', timestamp: new Date().toISOString(), findings, complexity: performanceAgent.estimateComplexityLabel(body.code) });
});

/** Style-only analysis */
app.post('/api/style-analysis', async c => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  if (!body?.code) return c.json({ error: 'code is required' }, 400);
  const findings = await styleAgent.analyzeCode(body.code, { context: body.context });
  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'warning').length * 3 - findings.filter(f => f.severity === 'info').length);
  return c.json({ status: 'success', timestamp: new Date().toISOString(), findings, score });
});

/** Batch review — multiple files */
app.post('/api/batch-review', async c => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  if (!Array.isArray(body?.files) || body.files.length === 0) return c.json({ error: 'files[] is required' }, 400);
  if (body.files.length > 10) return c.json({ error: 'Maximum 10 files per batch' }, 400);

  const results = await Promise.all(body.files.map(async (f: any) => {
    const [sec, perf, sty] = await Promise.all([
      securityAgent.analyzeCode(f.code || ''),
      performanceAgent.analyzeCode(f.code || ''),
      styleAgent.analyzeCode(f.code || ''),
    ]);
    return { id: f.id || crypto.randomUUID(), name: f.name || 'unknown', security: sec.length, performance: perf.length, style: sty.length, total: sec.length + perf.length + sty.length };
  }));

  return c.json({ status: 'success', batchId: crypto.randomUUID(), timestamp: new Date().toISOString(), results });
});

/** 404 */
app.all('*', c => c.json({ status: 'error', message: 'Not found', path: c.req.path }, 404));

export default app;
