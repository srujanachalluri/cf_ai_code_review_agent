# API Documentation

Complete API reference for the Code Review Agent system.

## Base URL

```
Development: http://localhost:8787
Production: https://your-domain.com
```

## Authentication

Include API key in request headers:

```
Authorization: Bearer YOUR_API_KEY
```

## Response Format

All responses are JSON with the following structure:

```json
{
  "status": "success|error",
  "timestamp": "ISO-8601-timestamp",
  "data": {}
}
```

---

## Endpoints

### 1. Health Check

**Endpoint**: `GET /health`

**Description**: Check system health and availability

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2025-04-18T10:30:00Z",
  "version": "1.0.0"
}
```

---

### 2. Comprehensive Code Review

**Endpoint**: `POST /api/review`

**Description**: Analyze code for security, performance, and style issues

**Request**:
```json
{
  "code": "function example() { ... }",
  "language": "javascript",
  "context": "user-input-handler.js",
  "focusAreas": ["security", "performance", "style"]
}
```

**Parameters**:
- `code` (string, required): Code to review (1-50,000 characters)
- `language` (string, optional): Programming language (default: "javascript")
  - Supported: javascript, typescript, python, java, go, rust
- `context` (string, optional): File path or context information
- `focusAreas` (array, optional): Analysis focus areas
  - Supported: "security", "performance", "style"
  - Default: all areas

**Response** (200):
```json
{
  "id": "review-123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "timestamp": "2025-04-18T10:30:15Z",
  "analyses": {
    "security": {
      "issues": 3,
      "score": 85,
      "findings": [
        {
          "id": "finding-uuid",
          "type": "sql_injection",
          "severity": "critical",
          "title": "SQL Injection Vulnerability",
          "description": "Dynamic SQL query with user input",
          "recommendation": "Use parameterized queries",
          "location": {
            "file": "unknown",
            "line": 5,
            "column": 0
          },
          "tags": ["security", "sql-injection"]
        }
      ]
    },
    "performance": {
      "issues": 2,
      "score": 75,
      "findings": [...]
    },
    "style": {
      "issues": 5,
      "score": 90,
      "findings": [...]
    }
  },
  "summary": {
    "totalIssues": 10,
    "criticalIssues": 1,
    "warnings": 5,
    "overallScore": 83
  }
}
```

**Error Response** (400):
```json
{
  "status": "error",
  "message": "Invalid request",
  "details": [
    {
      "path": ["code"],
      "message": "String must contain at least 1 character"
    }
  ]
}
```

**Error Response** (500):
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

### 3. Get Review Results

**Endpoint**: `GET /api/review/:id`

**Description**: Retrieve cached analysis results for a review

**Parameters**:
- `id` (path, required): Review ID from previous analysis

**Response** (200):
```json
{
  "id": "review-123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2025-04-18T10:30:15Z",
  "language": "javascript",
  "analyses": {
    "security": { ... },
    "performance": { ... },
    "style": { ... }
  },
  "scores": {
    "security": 85,
    "performance": 75,
    "style": 90,
    "overall": 83
  },
  "summary": {
    "totalIssues": 10,
    "criticalIssues": 1,
    "warnings": 5
  }
}
```

**Error Response** (404):
```json
{
  "status": "error",
  "message": "Review not found"
}
```

---

### 4. Security Analysis

**Endpoint**: `POST /api/security-analysis`

**Description**: Focused security vulnerability analysis

**Request**:
```json
{
  "code": "const x = eval(userInput);",
  "language": "javascript"
}
```

**Response** (200):
```json
{
  "status": "success",
  "timestamp": "2025-04-18T10:30:15Z",
  "analysis": {
    "vulnerabilities": [
      {
        "type": "Code Injection",
        "severity": "critical",
        "description": "eval() used with user input",
        "line": 1,
        "remediation": "Avoid eval(), use safer alternatives"
      }
    ],
    "securityScore": 45,
    "riskLevel": "critical"
  }
}
```

**Vulnerability Severity Levels**:
- `critical`: Immediate security risk
- `high`: Serious security issue
- `medium`: Potential security concern
- `low`: Minor security note

---

### 5. Performance Analysis

**Endpoint**: `POST /api/performance-analysis`

**Description**: Analyze code for performance issues and optimization opportunities

**Request**:
```json
{
  "code": "for(let i=0; i<arr.length; i++) { for(let j=0; j<arr.length; j++) { ... } }"
}
```

**Response** (200):
```json
{
  "status": "success",
  "timestamp": "2025-04-18T10:30:15Z",
  "analysis": {
    "issues": [
      {
        "type": "algorithmic_complexity",
        "severity": "warning",
        "title": "High Nested Loop Complexity",
        "description": "Detected 2 nested loops resulting in O(n²) complexity",
        "impact": "Significant performance degradation with large datasets",
        "optimization": "Consider using hash maps or sets for O(n) solution",
        "line": 1
      }
    ],
    "score": 65,
    "suggestions": [
      "Cache array length before loop",
      "Consider using array methods like map/filter"
    ],
    "estimatedComplexity": "O(n²) - Quadratic"
  }
}
```

**Performance Issue Types**:
- `algorithmic_complexity`: Big O analysis
- `memory_issue`: Memory efficiency concerns
- `n_plus_one_query`: Database query optimization
- `render_performance`: React/UI rendering issues
- `loop_optimization`: Loop efficiency

---

### 6. Style Analysis

**Endpoint**: `POST /api/style-analysis`

**Description**: Code style, quality, and architectural analysis

**Request**:
```json
{
  "code": "const x = eval(userInput); let Y = 5;"
}
```

**Response** (200):
```json
{
  "status": "success",
  "timestamp": "2025-04-18T10:30:15Z",
  "analysis": {
    "violations": [
      {
        "rule": "naming_convention",
        "severity": "info",
        "description": "Variable 'Y' uses PascalCase, should use camelCase",
        "line": 1,
        "suggestion": "Rename to 'y'"
      }
    ],
    "score": 88,
    "suggestions": [
      "Use consistent naming conventions",
      "Add documentation comments to functions",
      "Consider extracting complex logic into separate functions"
    ]
  }
}
```

**Style Rule Categories**:
- `naming_convention`: Variable and function naming
- `function_length`: Function size and complexity
- `magic_numbers`: Hard-coded values
- `documentation`: Comment and doc requirements
- `solid_principles`: SOLID design principle compliance
- `design_patterns`: Design pattern suggestions
- `readability`: Code readability metrics

---

### 7. Batch Review

**Endpoint**: `POST /api/batch-review`

**Description**: Analyze multiple code files in a single request

**Request**:
```json
{
  "files": [
    {
      "id": "file1",
      "name": "handler.js",
      "code": "..."
    },
    {
      "id": "file2",
      "name": "utils.js",
      "code": "..."
    }
  ]
}
```

**Parameters**:
- `files` (array, required): Array of files to analyze
  - `id` (string, optional): File identifier
  - `name` (string, optional): File name
  - `code` (string, required): File contents

**Response** (200):
```json
{
  "status": "success",
  "batchId": "batch-uuid",
  "timestamp": "2025-04-18T10:30:15Z",
  "results": [
    {
      "fileId": "file1",
      "fileName": "handler.js",
      "security": 3,
      "performance": 1,
      "style": 5
    },
    {
      "fileId": "file2",
      "fileName": "utils.js",
      "security": 0,
      "performance": 2,
      "style": 3
    }
  ]
}
```

**Limits**:
- Maximum 10 files per batch
- Maximum 500KB total code size
- Maximum 50KB per file

---

### 8. System Statistics

**Endpoint**: `GET /api/stats`

**Description**: Get system capabilities and statistics

**Response** (200):
```json
{
  "status": "success",
  "timestamp": "2025-04-18T10:30:15Z",
  "stats": {
    "agents": 3,
    "agentTypes": [
      "security",
      "performance",
      "style"
    ],
    "capabilities": [
      "SQL Injection Detection",
      "XSS Vulnerability Detection",
      "Hardcoded Secrets Detection",
      "Algorithmic Complexity Analysis",
      "Memory Leak Detection",
      "N+1 Query Detection",
      "Code Style Validation",
      "Naming Convention Checks",
      "SOLID Principles Compliance",
      "Design Pattern Analysis"
    ]
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | Valid analysis completed |
| 400 | Bad Request | Invalid code format |
| 404 | Not Found | Review ID doesn't exist |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Internal processing error |
| 504 | Gateway Timeout | Analysis exceeded timeout |

### Error Response Format

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "timestamp": "2025-04-18T10:30:15Z",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Errors

**Invalid Code Length**:
```json
{
  "status": "error",
  "message": "Code size exceeds maximum of 50000 characters",
  "code": "CODE_SIZE_EXCEEDED"
}
```

**Unsupported Language**:
```json
{
  "status": "error",
  "message": "Language 'cobol' is not supported",
  "code": "UNSUPPORTED_LANGUAGE"
}
```

**Rate Limit Exceeded**:
```json
{
  "status": "error",
  "message": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "retryAfter": 60
}
```

---

## Request/Response Examples

### cURL Example

```bash
curl -X POST http://localhost:8787/api/review \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function test() { const password = \"secret123\"; }",
    "language": "javascript",
    "focusAreas": ["security"]
  }'
```

### JavaScript/Fetch Example

```javascript
const response = await fetch('http://localhost:8787/api/review', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    code: 'const x = eval(userInput);',
    language: 'javascript',
    focusAreas: ['security', 'performance']
  })
});

const result = await response.json();
console.log(result);
```

### Python Example

```python
import requests
import json

url = 'http://localhost:8787/api/review'
payload = {
    'code': 'def example():\n    x = eval(user_input)',
    'language': 'python',
    'focusAreas': ['security', 'performance']
}

response = requests.post(url, json=payload)
result = response.json()
print(json.dumps(result, indent=2))
```

---

## Rate Limiting

API rate limits per hour:
- Free tier: 100 requests
- Pro tier: 10,000 requests
- Enterprise: Unlimited

Rate limit headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1639922400
```

---

## Webhooks (Future)

Asynchronous processing with webhooks:

```json
{
  "webhookUrl": "https://your-domain.com/webhook",
  "events": ["review.completed", "review.error"]
}
```

---

## Versioning

API version: `v1`

Current version is embedded in base URL. Breaking changes will increment version.

---

## Support

For API issues or questions:
- Check [GitHub Issues](https://github.com/yourusername/cf_ai_code_review_agent/issues)
- Read [Architecture Documentation](./ARCHITECTURE.md)
- Review [Examples](../examples/)

---

**Last Updated**: April 18, 2026  
**API Version**: 1.0.0
