# Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [Database Setup](#database-setup)
5. [Monitoring & Logging](#monitoring--logging)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- Cloudflare account with Workers enabled
- Wrangler CLI installed: `npm install -g wrangler`

## Local Development

### 1. Setup

```bash
# Clone repository
git clone https://github.com/yourusername/cf_ai_code_review_agent.git
cd cf_ai_code_review_agent

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your settings
```

### 2. Run Development Server

```bash
# Start local development server with hot reload
npm run dev

# Server runs on http://localhost:8787
```

### 3. Test API Locally

```bash
# Health check
curl http://localhost:8787/health

# Test code review
curl -X POST http://localhost:8787/api/review \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const x = eval(userInput);",
    "language": "javascript"
  }'

# Test security analysis
curl -X POST http://localhost:8787/api/security-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const password = \"secret123\";"
  }'
```

## Production Deployment

### 1. Authentication Setup

```bash
# Login to Cloudflare
wrangler login

# This opens browser for authentication
# Authorization token is saved in ~/.wrangler/
```

### 2. Create Cloudflare Resources

```bash
# Create D1 database (if not using existing)
wrangler d1 create code_review_db

# Create KV namespace (if not using existing)
wrangler kv:namespace create REVIEW_CACHE

# Create Analytics Engine binding (optional)
# Done through Cloudflare dashboard
```

### 3. Configure wrangler.toml

Update `wrangler.toml` with your Cloudflare settings:

```toml
[env.production]
account_id = "your_account_id"
name = "cf-ai-code-review-prod"

[[env.production.d1_databases]]
binding = "DB"
database_id = "your_database_id"

[[env.production.kv_namespaces]]
binding = "KV"
id = "your_kv_id"
```

### 4. Build and Deploy

```bash
# Build project
npm run build

# Type check
npm run type-check

# Deploy to production
npm run deploy

# Deploy to staging
wrangler deploy --env staging
```

### 5. Verify Deployment

```bash
# Check deployment status
wrangler deployments list

# View live logs
wrangler tail

# Test production endpoint
curl https://your-domain.com/health
```

## Database Setup

### 1. Initialize Database Schema

```bash
# Create tables
wrangler d1 execute code_review_db < migrations/001_init_schema.sql

# Verify tables
wrangler d1 execute code_review_db "SELECT name FROM sqlite_master WHERE type='table';"
```

### 2. Database Migrations

When updating schema:

```bash
# Create new migration
touch migrations/002_add_new_column.sql

# Edit file with migration SQL

# Execute migration
wrangler d1 execute code_review_db < migrations/002_add_new_column.sql
```

### Example Schema Initialization

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_snippet TEXT NOT NULL,
  language TEXT DEFAULT 'javascript',
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  line_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id)
);

CREATE INDEX IF NOT EXISTS idx_review_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_finding_review ON findings(review_id);
```

## Monitoring & Logging

### 1. View Logs

```bash
# Real-time logs
wrangler tail

# Filter logs
wrangler tail --format pretty

# Save to file
wrangler tail > logs.txt
```

### 2. Analytics

Access Cloudflare Analytics dashboard:
- Requests per minute
- Error rates
- Response times
- Geographic distribution

### 3. Performance Monitoring

```bash
# Check Worker metrics
wrangler analytics engine tail

# Monitor KV performance
# Check Cloudflare dashboard
```

### 4. Set Up Alerts

In Cloudflare dashboard:
1. Go to Notifications
2. Create alert for:
   - High error rates (>5%)
   - High latency (>500ms)
   - Worker errors

## Environment Configuration

### Production Environment Variables

```bash
# Set secrets
wrangler secret put API_KEY
wrangler secret put JWT_SECRET
wrangler secret put ANTHROPIC_API_KEY

# Verify secrets are set (shows name only)
wrangler secret list
```

### Feature Flags

Configure via environment:

```toml
[env.production]
vars = { ENABLE_HUMAN_APPROVAL = "true", ENABLE_ANALYTICS = "true" }

[env.staging]
vars = { ENABLE_HUMAN_APPROVAL = "false", ENABLE_ANALYTICS = "true" }
```

## Rollback Procedure

If deployment has issues:

```bash
# View deployment history
wrangler deployments list

# Rollback to previous version
wrangler rollback

# Or deploy specific version
wrangler deploy --compatibility-date 2025-04-18
```

## Performance Optimization

### 1. Caching Strategy

- Reviews cached in KV for 24 hours
- Database query results cached
- Use Cache-Control headers

### 2. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_status_created ON reviews(status, created_at);
CREATE INDEX idx_finding_severity ON findings(severity);
```

### 3. Worker Optimization

- Keep code under 1MB
- Minimize dependencies
- Use async/await for I/O
- Implement request batching

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

```bash
# Re-authenticate
wrangler logout
wrangler login

# Check token
wrangler whoami
```

#### 2. Database Connection Issues

```bash
# Test database connection
wrangler d1 execute code_review_db "SELECT 1;"

# Check database binding in wrangler.toml
```

#### 3. Deployment Failures

```bash
# Check build errors
npm run build

# Verify TypeScript
npm run type-check

# Check logs
wrangler tail --status=error
```

#### 4. Timeout Issues

If analysis times out:
- Increase `ANALYSIS_TIMEOUT_MS` in env
- Optimize code parsing logic
- Use streaming responses for large files

### Debug Mode

Enable debug logging:

```toml
[env.debug]
vars = { LOG_LEVEL = "debug" }
```

Then deploy:
```bash
wrangler deploy --env debug
```

## Scaling Considerations

### Horizontal Scaling
- Cloudflare Workers auto-scale globally
- No manual scaling needed

### Database Scaling
- D1 suitable for moderate load
- Consider analytics import for analysis storage
- Archive old reviews to reduce DB size

### Cost Optimization
- Monitor requests/month
- Clean up old reviews (implement TTL)
- Optimize database queries
- Cache frequently requested reviews

## Security Checklist

- [ ] API keys rotated regularly
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SQL injection prevention verified
- [ ] Secrets stored as environment variables
- [ ] Audit logging enabled
- [ ] Data encryption in transit

## Maintenance Schedule

- Weekly: Check error logs and alerts
- Monthly: Review performance metrics
- Quarterly: Security audit
- Annually: Major version updates

---

For more information, see:
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
