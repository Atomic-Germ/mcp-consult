# MCP Ollama Consult - Usage Examples

Comprehensive examples demonstrating how to use MCP Ollama Consult for various scenarios.

## Table of Contents

- [Basic Consultation](#basic-consultation)
- [Model Comparison](#model-comparison)
- [Sequential Reasoning Chains](#sequential-reasoning-chains)
- [Memory Management](#memory-management)
- [Real-World Scenarios](#real-world-scenarios)
- [Integration Patterns](#integration-patterns)
- [Advanced Usage](#advanced-usage)

## Basic Consultation

### Simple Question & Answer

```typescript
{
  tool: "consult_ollama",
  arguments: {
    prompt: "What is the difference between REST and GraphQL?",
    model: "llama3.2"
  }
}
```

### Code Review

```typescript
{
  tool: "consult_ollama", 
  arguments: {
    prompt: `Review this React component for best practices:

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch('/api/users/' + userId)
      .then(response => response.json())
      .then(setUser);
  }, [userId]);
  
  return <div>{user?.name}</div>;
}`,
    model: "qwen2.5-coder:7b",
    context: "This is for a production React application with TypeScript",
    systemPrompt: "You are a senior React developer. Focus on performance, security, and maintainability."
  }
}
```

### Architecture Consultation

```typescript
{
  tool: "consult_ollama",
  arguments: {
    prompt: "Design a scalable architecture for a real-time chat application that needs to support 100K concurrent users",
    model: "deepseek-v3.1",
    context: "Budget constraints require cloud-native solutions, team has experience with Node.js and React",
    timeoutMs: 300000
  }
}
```

## Model Comparison

### Technology Decision

```typescript
{
  tool: "compare_ollama_models",
  arguments: {
    prompt: "Should we use Kubernetes or Docker Swarm for our microservices deployment?",
    models: ["llama3.2", "qwen2.5-coder:7b", "deepseek-v3.1"],
    context: "Medium-sized startup, 15-person engineering team, budget-conscious, needs to deploy 8 microservices"
  }
}
```

### Code Solution Alternatives

```typescript
{
  tool: "compare_ollama_models",
  arguments: {
    prompt: "Implement a rate limiter in Python with these requirements: 100 requests per minute per user, memory-efficient, thread-safe",
    models: ["qwen2.5-coder:7b", "deepseek-v3.1"],
    context: "Flask web application, Redis available, performance is critical",
    timeoutMs: 180000
  }
}
```

### Design Pattern Evaluation

```typescript
{
  tool: "compare_ollama_models", 
  arguments: {
    prompt: "Compare Observer vs Pub/Sub patterns for this use case: user activity tracking in a social media app",
    models: ["llama3.2", "qwen2.5-coder:7b"],
    context: "Need to track likes, comments, shares, follows across multiple services"
  }
}
```

## Sequential Reasoning Chains

### Code Analysis to Implementation

```typescript
{
  tool: "sequential_consultation_chain",
  arguments: {
    consultants: [
      {
        id: "analyzer",
        model: "llama3.2",
        prompt: `Analyze this legacy PHP code for refactoring opportunities:

function processOrder($order) {
    global $db, $email, $inventory;
    
    if (!$order) return false;
    
    if ($order['total'] > 1000) {
        $discount = 0.1;
        $order['total'] *= (1 - $discount);
    }
    
    $query = "INSERT INTO orders VALUES ('" . $order['id'] . "', '" . $order['total'] . "')";
    mysql_query($query);
    
    if ($order['total'] > 500) {
        mail($order['email'], 'Order Confirmation', 'Your order has been processed');
    }
    
    return true;
}`,
        timeoutMs: 120000
      },
      {
        id: "architect",
        model: "qwen2.5-coder:7b", 
        prompt: "Based on {analyzer}'s analysis, design a modern object-oriented architecture that addresses the identified issues",
        timeoutMs: 180000
      },
      {
        id: "implementer",
        model: "deepseek-v3.1",
        prompt: "Using {architect}'s design, write clean, modern PHP code that implements the proposed architecture",
        timeoutMs: 240000
      }
    ]
  }
}
```

### Security Review Process

```typescript
{
  tool: "sequential_consultation_chain",
  arguments: {
    consultants: [
      {
        id: "security_auditor",
        model: "llama3.2",
        prompt: `Perform security audit of this authentication endpoint:

POST /api/login
{
  "username": "user@example.com",
  "password": "plaintext_password"
}

Current implementation:
- Stores passwords in MD5
- No rate limiting
- JWT tokens never expire
- No HTTPS enforcement`,
        systemPrompt: "You are a cybersecurity expert specializing in web application security",
        timeoutMs: 150000
      },
      {
        id: "security_architect",
        model: "qwen2.5-coder:7b",
        prompt: "Based on {security_auditor}'s findings, design a comprehensive security strategy with specific technical recommendations",
        timeoutMs: 180000
      },
      {
        id: "developer",
        model: "deepseek-v3.1", 
        prompt: "Implement {security_architect}'s recommendations with working code examples and configuration",
        timeoutMs: 300000
      }
    ]
  }
}
```

### Product Planning Chain

```typescript
{
  tool: "sequential_consultation_chain",
  arguments: {
    consultants: [
      {
        id: "market_analyst",
        model: "llama3.2",
        prompt: "Analyze market opportunity for a developer productivity tool that helps with code reviews using AI",
        context: "Target audience: mid-size tech companies (50-500 developers)"
      },
      {
        id: "product_manager",
        model: "qwen2.5-coder:7b",
        prompt: "Based on {market_analyst}'s research, define MVP features and roadmap for the code review AI tool"
      },
      {
        id: "tech_lead",
        model: "deepseek-v3.1",
        prompt: "Using {product_manager}'s requirements, design the technical architecture and implementation plan"
      }
    ]
  }
}
```

## Memory Management

### Storing Analysis Results

```typescript
// First, get architectural guidance
{
  tool: "consult_ollama",
  arguments: {
    prompt: "Design microservices architecture for e-commerce platform with these requirements: user management, product catalog, order processing, payment integration, inventory management",
    model: "deepseek-v3.1",
    context: "Expected 50K daily active users, budget $5K/month for infrastructure",
    timeoutMs: 300000
  }
}

// Then store the result for future reference
{
  tool: "remember_consult",
  arguments: {
    key: "ecommerce_architecture_2024_v1",
    value: "< response from above consultation >",
    metadata: {
      model: "deepseek-v3.1",
      topic: "microservices_architecture",
      project: "ecommerce_platform",
      requirements: "50k_dau_5k_budget",
      version: "1.0"
    },
    tags: ["architecture", "microservices", "ecommerce", "scalability"]
  }
}
```

### Building Knowledge Base

```typescript
// Store coding standards
{
  tool: "remember_consult", 
  arguments: {
    key: "typescript_coding_standards",
    value: "Our TypeScript coding standards: 1. Use strict mode, 2. Prefer interfaces over types for object shapes, 3. Use enum for constants...",
    tags: ["coding-standards", "typescript", "team-guidelines"]
  }
}

// Store architectural decisions
{
  tool: "remember_consult",
  arguments: {
    key: "adr_001_database_choice",
    value: "ADR-001: Use PostgreSQL for main database. Reasoning: ACID compliance needed, team expertise, excellent JSON support...",
    metadata: {
      type: "architectural_decision",
      status: "accepted",
      date: "2024-11-17"
    },
    tags: ["adr", "database", "postgresql"]
  }
}
```

## Real-World Scenarios

### Debugging Session

```typescript
{
  tool: "sequential_consultation_chain",
  arguments: {
    consultants: [
      {
        id: "debugger",
        model: "qwen2.5-coder:7b",
        prompt: `Help debug this performance issue:

Symptom: Web page takes 8-12 seconds to load
Stack: React frontend, Node.js/Express backend, PostgreSQL
Database queries are fast (< 100ms)
Network requests show 200ms RTT

Chrome DevTools shows:
- Bundle size: 2.3MB
- 47 JavaScript files loaded
- 23 CSS files loaded  
- Total requests: 156
- Largest contentful paint: 8.2s`,
        systemPrompt: "You are a performance optimization specialist"
      },
      {
        id: "optimizer", 
        model: "deepseek-v3.1",
        prompt: "Based on {debugger}'s analysis, provide step-by-step optimization plan with specific webpack, React, and bundling improvements",
        timeoutMs: 240000
      }
    ]
  }
}
```

### Code Refactoring Consultation

```typescript
{
  tool: "compare_ollama_models",
  arguments: {
    prompt: `Refactor this legacy jQuery code to modern vanilla JavaScript:

$('#user-form').on('submit', function(e) {
    e.preventDefault();
    var formData = $(this).serialize();
    
    $.ajax({
        url: '/api/users',
        type: 'POST', 
        data: formData,
        success: function(response) {
            $('#message').html('<div class="success">User created!</div>');
            $('#user-form')[0].reset();
        },
        error: function(xhr, status, error) {
            $('#message').html('<div class="error">Error: ' + error + '</div>');
        }
    });
});`,
    models: ["qwen2.5-coder:7b", "deepseek-v3.1"],
    context: "Must support IE11, no external dependencies allowed, prefer modern ES6+ features where possible"
  }
}
```

### API Design Review

```typescript
{
  tool: "consult_ollama",
  arguments: {
    prompt: `Review this REST API design for a blog platform:

GET /posts - list all posts
GET /posts/:id - get specific post  
POST /posts - create post (requires auth)
PUT /posts/:id - update post (requires auth + ownership)
DELETE /posts/:id - delete post (requires auth + ownership)

GET /users/:id/posts - get user's posts
GET /posts/:id/comments - get post comments
POST /posts/:id/comments - add comment (requires auth)

POST /auth/login - login
POST /auth/register - register
POST /auth/logout - logout

What improvements would you suggest?`,
    model: "llama3.2",
    context: "Planning to support mobile app, expecting 10K users, using JWT tokens",
    systemPrompt: "You are a senior backend architect with expertise in REST API design"
  }
}
```

## Integration Patterns

### With CI/CD Pipeline

```typescript
// Code quality consultation in CI
{
  tool: "consult_ollama",
  arguments: {
    prompt: `Analyze this pull request for code quality issues:

Files changed: 3
Lines added: 247
Lines removed: 89

Key changes:
- Refactored user authentication service
- Added password complexity validation  
- Updated API error handling
- Added unit tests for new validation logic

Code complexity increased from 6.2 to 8.7
Test coverage decreased from 89% to 84%

Should this PR be approved?`,
    model: "qwen2.5-coder:7b",
    context: "Team follows strict code quality standards, deadline pressure is moderate"
  }
}
```

### With Development Tools

```typescript
// Architecture decision support
{
  tool: "sequential_consultation_chain",
  arguments: {
    consultants: [
      {
        id: "requirements_analyst",
        model: "llama3.2", 
        prompt: "Analyze requirements for choosing between GraphQL and REST for this API: social media platform with user profiles, posts, comments, real-time notifications"
      },
      {
        id: "architect",
        model: "qwen2.5-coder:7b",
        prompt: "Based on {requirements_analyst}, make specific technology recommendation with pros/cons"
      }
    ]
  }
}
```

### With Monitoring/Alerts

```typescript
// Performance incident analysis
{
  tool: "consult_ollama",
  arguments: {
    prompt: `Analyze this performance incident:

Time: 2024-11-17 14:30-15:45 UTC
Duration: 75 minutes
Impact: 40% increase in response time

Metrics during incident:
- CPU usage: 85% (normal: 45%)
- Memory usage: 92% (normal: 60%)  
- Database connections: 95/100 (normal: 40/100)
- Queue depth: 2,847 jobs (normal: 12 jobs)

Recent deployments:
- User service v2.3.1 (deployed 1 hour before incident)
- Updated database schema (3 hours before)

What likely caused this and how to prevent it?`,
    model: "deepseek-v3.1",
    context: "Node.js microservices, PostgreSQL database, Redis queue, AWS infrastructure",
    timeoutMs: 180000
  }
}
```

## Advanced Usage

### Custom System Prompts

```typescript
{
  tool: "consult_ollama",
  arguments: {
    prompt: "How should we structure our React components for this e-commerce site?",
    model: "qwen2.5-coder:7b", 
    systemPrompt: `You are a React expert with these constraints:
- Must use function components only
- TypeScript strict mode required
- Performance is critical (mobile users on slow connections)
- Team prefers composition over inheritance
- Must be accessible (WCAG 2.1 AA compliance)
- Prefer CSS modules over styled-components`
  }
}
```

### Context-Rich Consultations

```typescript
{
  tool: "consult_ollama",
  arguments: {
    prompt: "Should we migrate this service to Kubernetes?",
    model: "llama3.2",
    context: `Current setup:
- Single VM running Docker Compose
- 4 services: web, api, database, redis
- 500 daily active users
- 99.2% uptime over 6 months
- Team: 3 developers, 1 devops engineer
- Budget: $800/month for infrastructure
- Growth: 20% monthly user increase
- Pain points: deployment downtime, scaling web service manually

Team experience:
- Strong Docker knowledge
- Basic AWS experience  
- No Kubernetes experience
- Limited time for learning (startup phase)`
  }
}
```

### Chain with Error Handling

```typescript
{
  tool: "sequential_consultation_chain",
  arguments: {
    consultants: [
      {
        id: "reviewer",
        model: "llama3.2",
        prompt: "Review this database schema for a booking system",
        timeoutMs: 90000
      },
      {
        id: "optimizer",
        model: "qwen2.5-coder:7b", 
        prompt: "If {reviewer} found issues, provide optimization suggestions. If no issues, suggest performance enhancements.",
        timeoutMs: 120000
      },
      {
        id: "implementer",
        model: "deepseek-v3.1",
        prompt: "Based on {optimizer}'s recommendations, provide SQL migration scripts and updated schema",
        timeoutMs: 180000
      }
    ]
  }
}
```

### Multi-Language Consultation

```typescript
{
  tool: "compare_ollama_models",
  arguments: {
    prompt: "Implement bubble sort algorithm with detailed comments explaining each step",
    models: ["qwen2.5-coder:7b", "deepseek-v3.1"],
    context: "Need implementations in Python, JavaScript, and Go. Focus on readability for teaching purposes."
  }
}
```

## Best Practices

### Timeout Management

```typescript
// Short timeout for quick questions
{
  tool: "consult_ollama",
  arguments: {
    prompt: "What HTTP status code should I use for 'resource not found'?",
    model: "llama3.2",
    timeoutMs: 30000
  }
}

// Long timeout for complex analysis
{
  tool: "consult_ollama", 
  arguments: {
    prompt: "Perform comprehensive security audit of this authentication system...",
    model: "deepseek-v3.1",
    timeoutMs: 600000  // 10 minutes
  }
}
```

### Memory Organization

```typescript
// Use structured keys
{
  tool: "remember_consult",
  arguments: {
    key: "project_alpha/architecture/auth_service/v2.1",
    value: "Authentication service architecture...",
    tags: ["project-alpha", "auth", "architecture", "v2.1"]
  }
}

// Include search metadata
{
  tool: "remember_consult",
  arguments: {
    key: "team_decisions/database_choice_2024",
    value: "Decision: PostgreSQL for primary database...",
    metadata: {
      decision_date: "2024-11-17",
      participants: ["john", "sarah", "mike"],
      alternatives_considered: ["MySQL", "MongoDB"],
      review_date: "2025-05-17"
    }
  }
}
```

### Chain Optimization

```typescript
// Use specific, focused consultants
{
  tool: "sequential_consultation_chain",
  arguments: {
    consultants: [
      {
        id: "security_scanner",
        model: "llama3.2",
        prompt: "Scan for security vulnerabilities only",
        timeoutMs: 60000
      },
      {
        id: "security_fixer", 
        model: "qwen2.5-coder:7b",
        prompt: "Fix vulnerabilities found by {security_scanner}",
        timeoutMs: 120000
      }
    ]
  }
}
```