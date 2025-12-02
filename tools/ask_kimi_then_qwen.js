#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.cwd();
const tmpDir = path.join(root, '.tmp');
const resultsFile = path.join(tmpDir, 'kimi_suggestions.json');

try {
  fs.mkdirSync(tmpDir, { recursive: true });
} catch (e) {}

console.log('='.repeat(80));
console.log('TWO-STAGE CONSULTATION WORKFLOW');
console.log('='.repeat(80));
console.log('\n🧠 Stage 1: Kimi (Thinking) - Generate tool suggestions');
console.log('📝 Stage 2: Qwen (Instruction) - Generate implementation instructions\n');
console.log('='.repeat(80) + '\n');

// Stage 1: Run kimi consultation
console.log('Stage 1: Consulting kimi-k2-thinking:cloud...');
console.log('(This may take 2-3 minutes)\n');

try {
  const kimiOutput = execSync('node tools/ask/ask_kimi.js --run', {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
  });

  // Parse the MCP response
  let mcpResponse;
  try {
    mcpResponse = JSON.parse(kimiOutput);
  } catch (e) {
    console.error('Failed to parse kimi output as JSON. Raw output:');
    console.log(kimiOutput);
    process.exit(1);
  }

  // Extract the text content
  const textContent = mcpResponse.content?.[0]?.text;
  if (!textContent) {
    console.error('No text content in kimi response');
    console.log(JSON.stringify(mcpResponse, null, 2));
    process.exit(1);
  }

  // Try to extract JSON from the response (it might be wrapped in markdown)
  let suggestions;
  const jsonMatch = textContent.match(/\{[\s\S]*"suggested_tools"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      suggestions = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse extracted JSON. Trying full text...');
      suggestions = JSON.parse(textContent);
    }
  } else {
    suggestions = JSON.parse(textContent);
  }

  // Save to file
  fs.writeFileSync(resultsFile, JSON.stringify(suggestions, null, 2), 'utf8');

  console.log('\n✅ Stage 1 Complete!');
  console.log(`   Suggested ${suggestions.suggested_tools?.length || 0} new tools`);
  console.log(`   Results saved to: ${resultsFile}\n`);
  console.log('='.repeat(80) + '\n');

  // Stage 2: Ask qwen for implementation instructions
  console.log('Stage 2: Consulting qwen3-vl:235b-instruct-cloud for implementation...');
  console.log('(This may take 1-2 minutes)\n');

  const qwenPrompt = buildQwenPrompt(suggestions);

  // Create temporary qwen client
  const distDir = path.join(root, 'dist');
  const serverDist = path.join(distDir, 'index.js');
  const qwenClientFile = path.join(tmpDir, `qwen_client_${Date.now()}.js`);

  const qwenClientScript = `import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({ command: 'node', args: ['${serverDist}'] });
const client = new Client({ name: 'qwen-instruction-client', version: '1.0.0' }, { capabilities: {} });

async function main(){
  await client.connect(transport);
  const result = await client.callTool({ 
    name: 'consult_ollama', 
    arguments: { 
      consultation_type: 'instruction', 
      prompt: ${JSON.stringify(qwenPrompt)},
      timeout_ms: 180000 
    } 
  });
  await client.close();
  console.log(JSON.stringify(result, null, 2));
}
main().catch(console.error);
`;

  fs.writeFileSync(qwenClientFile, qwenClientScript, 'utf8');

  const qwenOutput = execSync(`node ${qwenClientFile}`, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  // Clean up temp file
  fs.unlinkSync(qwenClientFile);

  // Parse qwen response
  const qwenResponse = JSON.parse(qwenOutput);
  const instructions = qwenResponse.content?.[0]?.text;

  if (!instructions) {
    console.error('No instructions from qwen');
    console.log(JSON.stringify(qwenResponse, null, 2));
    process.exit(1);
  }

  // Save combined output
  const finalOutput = {
    stage_1_thinking: suggestions,
    stage_2_instructions: instructions,
    generated_at: new Date().toISOString(),
  };

  const finalFile = path.join(tmpDir, 'toolkit_enhancement_plan.json');
  fs.writeFileSync(finalFile, JSON.stringify(finalOutput, null, 2), 'utf8');

  // Also save a markdown version
  const mdFile = path.join(root, 'TOOLKIT_ENHANCEMENT_PLAN.md');
  const markdown = buildMarkdown(suggestions, instructions);
  fs.writeFileSync(mdFile, markdown, 'utf8');

  console.log('\n✅ Stage 2 Complete!\n');
  console.log('='.repeat(80));
  console.log('RESULTS:');
  console.log('='.repeat(80));
  console.log(`📊 Full analysis: ${finalFile}`);
  console.log(`📄 Markdown report: ${mdFile}`);
  console.log('\nInstructions preview:');
  console.log('-'.repeat(80));
  console.log(instructions.substring(0, 500) + '...\n');
} catch (error) {
  console.error('Error during consultation workflow:', error.message);
  if (error.stdout) console.log('STDOUT:', error.stdout.toString());
  if (error.stderr) console.log('STDERR:', error.stderr.toString());
  process.exit(1);
}

function buildQwenPrompt(suggestions) {
  const toolCount = suggestions.suggested_tools?.length || 0;
  const toolNames = suggestions.suggested_tools?.map((t) => t.tool_name).join(', ') || 'N/A';

  return `You are an expert TypeScript developer implementing MCP (Model Context Protocol) tools.

CONTEXT:
I received these ${toolCount} tool suggestions from a thinking model:
${JSON.stringify(suggestions, null, 2)}

TASK:
Provide step-by-step implementation instructions for the TOP 3 PRIORITY tools: ${suggestions.implementation_roadmap?.phase_1?.slice(0, 3).join(', ') || 'first 3 tools'}.

For EACH tool, provide:

1. **File Structure** - List all new files to create with their paths
2. **Handler Implementation** - TypeScript code for the tool handler class
3. **Service Integration** - How to integrate with existing OllamaService/ModelValidator
4. **Tool Registration** - How to add to listToolsHandler.ts and callToolHandler.ts
5. **Type Definitions** - Any new types/interfaces needed
6. **Testing Strategy** - Unit test structure and key test cases
7. **Implementation Order** - Sequence of steps to minimize breaking changes

FORMAT YOUR RESPONSE AS:
# Implementation Guide: [Tool Name]

## 1. File Structure
\`\`\`
src/handlers/[ToolName]Handler.ts
src/services/[ServiceName].ts (if needed)
test/[toolName].test.ts
\`\`\`

## 2. Handler Implementation
\`\`\`typescript
// Complete working code here
\`\`\`

(Continue for each section and each tool)

Focus on practical, copy-paste ready code that follows the existing architecture patterns in this codebase.`;
}

function buildMarkdown(suggestions, instructions) {
  const lines = [];
  lines.push('# MCP-Consult Toolkit Enhancement Plan');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🧠 Stage 1: Strategic Analysis (Kimi)');
  lines.push('');
  lines.push(`**Analysis Summary:** ${suggestions.analysis_summary || 'N/A'}`);
  lines.push('');
  lines.push('### Suggested Tools');
  lines.push('');

  if (suggestions.suggested_tools) {
    for (const tool of suggestions.suggested_tools) {
      lines.push(`#### ${tool.display_name} (\`${tool.tool_name}\`)`);
      lines.push('');
      lines.push(`- **Category:** ${tool.category}`);
      lines.push(`- **Priority:** ${tool.priority}`);
      lines.push(`- **Complexity:** ${tool.implementation?.complexity}`);
      lines.push(`- **Estimated Hours:** ${tool.implementation?.estimated_hours}`);
      lines.push('');
      lines.push(`**Description:** ${tool.description}`);
      lines.push('');
      lines.push(`**Value:** ${tool.value_proposition}`);
      lines.push('');
    }
  }

  lines.push('### Implementation Roadmap');
  lines.push('');
  if (suggestions.implementation_roadmap) {
    for (const [phase, tools] of Object.entries(suggestions.implementation_roadmap)) {
      lines.push(`- **${phase}:** ${tools.join(', ')}`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 📝 Stage 2: Implementation Instructions (Qwen)');
  lines.push('');
  lines.push(instructions);
  lines.push('');

  return lines.join('\n');
}
