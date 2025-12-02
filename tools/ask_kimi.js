#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const root = process.cwd();
const codeMapJsonPath = path.join(root, 'CODE_MAP.json');
const distDir = path.join(root, 'dist');

function buildPrompt(projects) {
  const lines = [];
  lines.push('# MCP-Consult Toolkit Enhancement Analysis\n');
  lines.push('## Current MCP Server Overview');
  lines.push(
    'This is an MCP (Model Context Protocol) server that provides AI consultation tools via Ollama models.\n'
  );

  lines.push('## Currently Implemented Tools:');
  lines.push('1. **consult_ollama** - Consult with Ollama AI models with support for:');
  lines.push(
    '   - consultation_type: "thinking" (kimi-k2-thinking:cloud), "instruction" (qwen3-vl:235b-instruct-cloud)'
  );
  lines.push('   - Custom model selection, system prompts, temperature, timeouts');
  lines.push('   - Context passing for code analysis and sequential reasoning');
  lines.push('2. **list_ollama_models** - List available Ollama models (local or cloud)');
  lines.push('3. **compare_ollama_responses** - Compare responses from multiple models');
  lines.push('4. **remember_context** - Store session context for future consultations\n');

  lines.push('## Project Structure:');
  if (projects && projects.length > 0) {
    for (const p of projects) {
      lines.push(`- ${p.path}: ${p.description || 'N/A'}`);
    }
  } else {
    lines.push('- TypeScript-based MCP server with modular handler architecture');
    lines.push('- Services: OllamaService, ModelValidator, ConfigManager');
    lines.push('- Handlers: ConsultOllamaHandler, CallToolHandler, ListToolsHandler');
  }

  lines.push('\n## Task: Design New MCP Tools for AI-to-AI Handoff');
  lines.push('Suggest **5-7 new MCP tools** that would enhance this toolkit.');
  lines.push(
    'These suggestions will be passed to qwen3-vl:235b-instruct-cloud for implementation instructions.\n'
  );

  lines.push('**CRITICAL: Format your response as a valid JSON object** with this structure:');
  lines.push('```json');
  lines.push('{');
  lines.push('  "analysis_summary": "Brief overview of toolkit gaps and opportunities",');
  lines.push('  "suggested_tools": [');
  lines.push('    {');
  lines.push('      "tool_name": "snake_case_tool_name",');
  lines.push('      "display_name": "Human-Readable Name",');
  lines.push('      "category": "collaboration|analysis|workflow|memory|meta",');
  lines.push('      "priority": "P0|P1|P2|P3",');
  lines.push('      "description": "What it does and why it\'s valuable (2-3 sentences)",');
  lines.push('      "value_proposition": "Key benefit in one sentence",');
  lines.push('      "parameters": {');
  lines.push('        "required": ["param1", "param2"],');
  lines.push('        "optional": ["param3", "param4"],');
  lines.push('        "schema": {');
  lines.push('          "param1": {"type": "string", "description": "..."},');
  lines.push('          "param2": {"type": "array", "items": "string", "description": "..."}');
  lines.push('        }');
  lines.push('      },');
  lines.push('      "use_cases": [');
  lines.push('        {"scenario": "Brief scenario", "example": "Concrete example call"}');
  lines.push('      ],');
  lines.push('      "implementation": {');
  lines.push('        "complexity": "low|medium|high",');
  lines.push('        "estimated_hours": 2-40,');
  lines.push('        "dependencies": ["Service1", "Service2"],');
  lines.push('        "new_components": ["Handler", "Service"],');
  lines.push('        "integration_points": ["Existing tool/service to extend"]');
  lines.push('      }');
  lines.push('    }');
  lines.push('  ],');
  lines.push('  "implementation_roadmap": {');
  lines.push('    "phase_1": ["tool_name_1", "tool_name_2"],');
  lines.push('    "phase_2": ["tool_name_3", "tool_name_4"],');
  lines.push('    "phase_3": ["tool_name_5"]');
  lines.push('  }');
  lines.push('}');
  lines.push('```\n');

  lines.push('Focus on tools that:');
  lines.push('- Enhance AI collaboration and multi-model reasoning workflows');
  lines.push('- Provide code analysis, documentation, or refactoring utilities');
  lines.push('- Support advanced consultation patterns (debate, consensus, chaining)');
  lines.push('- Enable better context/memory management');
  lines.push('- Integrate with developer workflows (git, testing, debugging)');
  lines.push('- Provide meta-capabilities (performance tracking, prompt optimization)\n');

  lines.push('**OUTPUT FORMAT REQUIREMENTS:**');
  lines.push('1. Return ONLY the JSON object (no markdown code fences, no preamble)');
  lines.push('2. Ensure valid JSON syntax (properly escaped quotes, no trailing commas)');
  lines.push('3. Use snake_case for tool_name fields');
  lines.push('4. Include all required fields for each tool');
  lines.push('5. Make descriptions concrete and actionable for implementation');

  return lines.join('\n');
}

async function runConsult(prompt) {
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found; run `npm run build` first.');
    process.exit(2);
  }
  const serverDist = path.join(distDir, 'index.js');
  if (!fs.existsSync(serverDist)) {
    console.error('Server dist not built. Run `npm run build` then retry.');
    process.exit(2);
  }

  // Create temporary client script
  const tmpDir = path.join(root, '.tmp');
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
  } catch (e) {}
  const tmpFile = path.join(tmpDir, `ask_kimi_client_${Date.now()}.js`);
  const clientScript = `import { Client } from '@modelcontextprotocol/sdk/client/index.js';\nimport { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';\n\nconst transport = new StdioClientTransport({ command: 'node', args: ['${serverDist}'] });\nconst client = new Client({ name: 'ask-kimi-client', version: '1.0.0' }, { capabilities: {} });\n\nasync function main(){\n  await client.connect(transport);\n  const result = await client.callTool({ name: 'consult_ollama', arguments: { consultation_type: 'thinking', prompt: ${JSON.stringify(prompt)}, timeout_ms: 180000 } });\n  await client.close();\n  console.log(JSON.stringify(result, null, 2));\n}\nmain().catch(console.error);\n`;
  fs.writeFileSync(tmpFile, clientScript, 'utf8');

  console.log('Consulting kimi-k2-thinking:cloud for MCP toolkit enhancement suggestions...');
  console.log('(This may take 2-3 minutes for deep reasoning)\n');
  const proc = spawn('node', [tmpFile], { cwd: root, stdio: 'inherit' });
  proc.on('close', (code) => {
    try {
      fs.unlinkSync(tmpFile);
    } catch (e) {}
    process.exit(code || 0);
  });
}

function main() {
  if (!fs.existsSync(codeMapJsonPath)) {
    console.warn('Code map JSON not found. Generating prompt without project details.');
  }
  const data = fs.existsSync(codeMapJsonPath)
    ? JSON.parse(fs.readFileSync(codeMapJsonPath, 'utf8'))
    : { projects: [] };
  const prompt = buildPrompt(data.projects || []);
  if (process.argv.includes('--dry-run') || !process.argv.includes('--run')) {
    console.log('Generated prompt for MCP toolkit enhancement suggestions:\n');
    console.log(prompt);
    console.log('\n' + '='.repeat(80));
    console.log('\nTo execute consultation with kimi-k2-thinking:cloud, run:');
    console.log('  npm run ask-kimi');
    console.log('  (or: node tools/ask/ask_kimi.js --run)');
    process.exit(0);
  }
  runConsult(prompt);
}

main();
