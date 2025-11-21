# Sequential Consultation Chain Demonstrations

This file demonstrates real-world usage of the sequential consultation chain tool for software development scenarios.

## Demo 1: Code Review Chain

**Scenario**: Review a complex function implementation through multiple expert perspectives.

````typescript
// Tool call for code review chain
{
  "consultants": [
    {
      "id": "architect",
      "model": "deepseek-v3.1:671b-cloud",
      "prompt": "Analyze this function from an architectural perspective. Does it follow SOLID principles? Are there any design pattern improvements?\n\n```python\ndef process_user_data(user_dict):\n    if not user_dict or 'email' not in user_dict:\n        raise ValueError('Invalid user data')\n    \n    # Validate email\n    email = user_dict['email']\n    if '@' not in email or '.' not in email:\n        raise ValueError('Invalid email format')\n    \n    # Process data\n    user_dict['email'] = email.lower().strip()\n    user_dict['created_at'] = datetime.now()\n    user_dict['status'] = 'active'\n    \n    # Save to database\n    db.users.insert_one(user_dict)\n    \n    # Send welcome email\n    send_email(email, 'Welcome!')\n    \n    return user_dict\n```"
    },
    {
      "id": "security_reviewer",
      "model": "qwen3-coder:480b-cloud",
      "prompt": "Building on the previous architectural analysis, examine this function for security vulnerabilities. Consider input validation, injection attacks, data exposure, and other security concerns."
    },
    {
      "id": "performance_optimizer",
      "model": "glm-4.6:cloud",
      "prompt": "Considering both the architectural and security feedback, analyze this function for performance issues. Look for bottlenecks, unnecessary operations, and optimization opportunities."
    },
    {
      "id": "final_reviewer",
      "model": "deepseek-v3.1:671b-cloud",
      "prompt": "Synthesize all the previous feedback and provide a final refactored version of this function that addresses architectural, security, and performance concerns. Include the improved code and a summary of changes made."
    }
  ],
  "context": {
    "systemPrompt": "You are an expert software developer participating in a code review process. Build upon previous reviewer comments and provide specific, actionable feedback.",
    "passThrough": true
  },
  "flowControl": {
    "continueOnError": false,
    "maxRetries": 2,
    "retryDelayMs": 1000
  },
  "memory": {
    "storeConversation": true,
    "memoryKey": "code_review_process_user_data"
  }
}
````

## Demo 2: Architecture Decision Chain

**Scenario**: Decide on the best architectural pattern for a new microservice.

```typescript
{
  "consultants": [
    {
      "id": "requirements_analyst",
      "model": "glm-4.6:cloud",
      "prompt": "We need to build a new notification service that handles email, SMS, and push notifications. It needs to scale to 10M notifications per day, support multiple tenants, and integrate with various providers. Analyze the requirements and suggest key architectural considerations."
    },
    {
      "id": "patterns_expert",
      "model": "deepseek-v3.1:671b-cloud",
      "prompt": "Based on the requirements analysis, evaluate different architectural patterns (Event Sourcing, CQRS, Hexagonal, Microservices, etc.) and recommend the most suitable approach for this notification service."
    },
    {
      "id": "infrastructure_specialist",
      "model": "qwen3-coder:480b-cloud",
      "prompt": "Given the architectural pattern recommendation, design the infrastructure and technology stack. Consider databases, message queues, caching, monitoring, and deployment strategies."
    },
    {
      "id": "implementation_planner",
      "model": "glm-4.6:cloud",
      "prompt": "Create a detailed implementation plan based on all previous analysis. Break down the work into phases, identify critical path items, and estimate effort for each component."
    }
  ],
  "context": {
    "systemPrompt": "You are an expert solution architect. Provide detailed, practical advice based on industry best practices and real-world experience.",
    "passThrough": true,
    "variables": {
      "project_timeline": "6 months",
      "team_size": "4 developers",
      "budget_constraints": "moderate"
    }
  }
}
```

## Demo 3: Bug Investigation Chain

**Scenario**: Debug a complex production issue through systematic investigation.

```typescript
{
  "consultants": [
    {
      "id": "log_analyzer",
      "model": "qwen3-coder:480b-cloud",
      "prompt": "Analyze these production logs to identify the root cause of intermittent 500 errors:\n\n[ERROR] 2024-01-15 10:23:45 - Database connection timeout after 30s\n[WARN] 2024-01-15 10:23:40 - High memory usage: 85%\n[INFO] 2024-01-15 10:23:35 - Processing batch of 1000 requests\n[ERROR] 2024-01-15 10:20:12 - Redis connection lost\n[INFO] 2024-01-15 10:15:00 - Cache miss rate: 45%"
    },
    {
      "id": "systems_specialist",
      "model": "deepseek-v3.1:671b-cloud",
      "prompt": "Based on the log analysis, examine the system architecture and resource utilization patterns. What infrastructure or configuration issues might be contributing to these errors?"
    },
    {
      "id": "code_detective",
      "model": "glm-4.6:cloud",
      "prompt": "Considering the log patterns and system analysis, what code-level issues could be causing these problems? Look for resource leaks, improper error handling, or concurrency issues."
    },
    {
      "id": "solution_architect",
      "model": "deepseek-v3.1:671b-cloud",
      "prompt": "Synthesize all the investigation findings and provide a comprehensive solution plan with immediate fixes, monitoring improvements, and preventive measures."
    }
  ],
  "context": {
    "systemPrompt": "You are a senior DevOps engineer investigating a critical production issue. Be systematic, thorough, and focus on actionable solutions.",
    "passThrough": true
  },
  "flowControl": {
    "continueOnError": true,
    "maxRetries": 1
  }
}
```

## Demo 4: Learning Path Chain

**Scenario**: Design a personalized learning path for a new technology.

```typescript
{
  "consultants": [
    {
      "id": "skill_assessor",
      "model": "glm-4.6:cloud",
      "prompt": "A mid-level Python developer wants to learn Rust. They have 5 years of Python experience, some C++ knowledge, and work primarily on web APIs. Assess their background and identify knowledge gaps for learning Rust effectively.",
      "timeoutMs": 90000
    },
    {
      "id": "curriculum_designer",
      "model": "deepseek-v3.1:671b-cloud",
      "prompt": "Based on the skill assessment, design a structured 3-month learning curriculum for Rust. Include topics, sequence, hands-on projects, and milestones.",
      "timeoutMs": 180000
    },
    {
      "id": "resource_curator",
      "model": "qwen3-coder:480b-cloud",
      "prompt": "For the proposed curriculum, recommend specific learning resources: books, tutorials, practice platforms, open source projects, and communities that align with their Python background.",
      "timeoutMs": 120000
    },
    {
      "id": "mentor_advisor",
      "model": "glm-4.6:cloud",
      "prompt": "Create a detailed action plan with weekly goals, practice exercises, and checkpoints to ensure successful completion of this Rust learning journey.",
      "timeoutMs": 150000
    }
  ],
  "context": {
    "systemPrompt": "You are an experienced technical educator and mentor. Provide practical, actionable learning guidance tailored to the individual's background and goals.",
    "passThrough": true
  }
}
```

**Note**: This example demonstrates custom timeout values for each step. The curriculum designer gets 180 seconds (3 minutes) as it may need to generate comprehensive learning plans.

## Benefits of Sequential Consultation Chains

1. **Progressive Refinement**: Each consultant builds on previous insights, leading to more comprehensive and nuanced solutions.

2. **Expertise Specialization**: Different models can be assigned roles that match their strengths (code analysis, architecture, optimization, etc.).

3. **Context Preservation**: The `passThrough` feature ensures each consultant sees the full conversation history, enabling deeper collaboration.

4. **Error Resilience**: Built-in retry mechanisms and graceful error handling ensure robust execution.

5. **Memory Integration**: Conversations can be stored for future reference and pattern analysis.

6. **Comprehensive Documentation**: Rich output format provides full traceability of the decision-making process.

## Best Practices

1. **Clear Role Definition**: Assign specific, non-overlapping responsibilities to each consultant.

2. **Logical Sequence**: Order consultants to build naturally on each other's work.

3. **Context Management**: Use `passThrough: true` when consultants need full context, `false` for independent analysis.

4. **Error Handling**: Set appropriate retry policies based on the criticality of each step.

5. **Memory Storage**: Store important conversations for team learning and pattern recognition.

6. **Timeout Configuration**: For complex tasks requiring longer processing, configure `timeoutMs` per consultant:
   - Default timeout: 120 seconds (120000ms)
   - For simple analysis: 60-90 seconds may suffice
   - For code generation/complex reasoning: 180-300 seconds recommended
   - For very large context processing: 300-600 seconds may be needed

## Advanced Usage Patterns

- **Branching Chains**: Use different consultant sequences for different scenarios
- **Parallel Analysis**: Run multiple chains in parallel for A/B comparison
- **Iterative Refinement**: Feed chain output back into a new chain for further improvement
- **Cross-Domain Integration**: Combine technical, business, and user experience perspectives
