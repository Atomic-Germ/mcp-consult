import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
  });

  const client = new Client({ name: 'mcp-demo-client', version: '1.0.0' });

  try {
    console.log("Connecting to stdio server (spawning 'node dist/index.js')...");
    await client.connect(transport);
    console.log('Connected. Listing tools...');

    const toolsRes = await client.listTools();
    console.log('Server tools:');
    for (const t of toolsRes.tools || []) {
      console.log(` - ${t.name}${t.description ? `: ${t.description}` : ''}`);
    }

    console.log("\nCalling 'list_ollama_models'...");
    const listRes = await client.callTool(
      { name: 'list_ollama_models', arguments: {} },
      CallToolResultSchema
    );

    if (listRes.isError) {
      console.error('list_ollama_models returned error:', listRes);
    } else {
      const content = listRes.content || [];
      const texts = (Array.isArray(content) ? content : [])
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
      console.log('list_ollama_models result:\n', texts);
    }

    // Try to pick a model name from the listing result; otherwise fall back
    let modelName = 'llama2';
    try {
      const content = listRes.content || [];
      const firstText =
        (Array.isArray(content) ? content : []).find((c: any) => c.type === 'text')?.text || '';
      const modelsMatch = firstText.match(/Available models:\s*(.*)/i);
      if (modelsMatch && modelsMatch[1]) {
        const models = modelsMatch[1]
          .split(/[,;\n]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        if (models.length > 0) modelName = models[0];
      } else {
        const firstLine = firstText.split(/\r?\n/)[0] || '';
        const candidate = firstLine.split(/[,\s]+/)[0];
        if (candidate) modelName = candidate;
      }
    } catch (err) {
      void err;
      // ignore parsing errors and use fallback
    }

    console.log(`Using model "${modelName}" for consult_ollama (best-effort).`);

    const prompt =
      'Please provide an alternative viewpoint to the claim: "We should rewrite coreutils in Rust." Keep it concise (3-4 sentences).';
    console.log("\nCalling 'consult_ollama' (with 15s timeout)...");

    // Helper to add a client-side timeout so the demo doesn't hang forever
    function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), ms);
        p.then((v) => {
          clearTimeout(timer);
          resolve(v);
        }).catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
      });
    }

    let consultRes: any = null;
    try {
      consultRes = await withTimeout(
        client.callTool(
          { name: 'consult_ollama', arguments: { model: modelName, prompt } },
          CallToolResultSchema
        ),
        15_000
      );
    } catch (err: any) {
      void err;
      console.error(
        'consult_ollama timed out or failed:',
        err instanceof Error ? err.message : String(err)
      );
    }

    if (consultRes) {
      if (consultRes.isError) {
        console.error('consult_ollama returned error:', consultRes);
      } else {
        const out = (Array.isArray(consultRes.content) ? consultRes.content : [])
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
        console.log('consult_ollama result:\n', out);
      }
    } else {
      console.log('No consult_ollama result (timed out or failed).');
    }

    // ---- New: call compare_ollama_models to show side-by-side outputs ----
    console.log("\nCalling 'compare_ollama_models' to compare model outputs...");

    // Try to extract available models from the previous list result (best effort)
    let availableModels: string[] = [];
    try {
      const firstText =
        (Array.isArray(listRes.content) ? listRes.content : []).find((c: any) => c.type === 'text')
          ?.text || '';
      const modelsMatch = firstText.match(/Available models:\s*(.*)/i);
      if (modelsMatch && modelsMatch[1]) {
        availableModels = modelsMatch[1]
          .split(/[,;\n]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    } catch (e) {
      void e;
      // ignore
    }

    const compareArgs: any = { prompt };
    if (availableModels.length >= 2) compareArgs.models = availableModels.slice(0, 2);

    try {
      const compareRes = await client.callTool(
        { name: 'compare_ollama_models', arguments: compareArgs },
        CallToolResultSchema
      );
      if (compareRes.isError) {
        console.error('compare_ollama_models returned error:', compareRes);
      } else {
        const cmp = (Array.isArray(compareRes.content) ? compareRes.content : [])
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n\n---\n\n');
        console.log('compare_ollama_models result:\n', cmp);
      }
    } catch (err: any) {
      void err;
      console.error(
        'compare_ollama_models failed:',
        err instanceof Error ? err.message : String(err)
      );
    }
  } catch (err: any) {
    void err;
    console.error('Demo failed:', err instanceof Error ? err.stack || err.message : String(err));
  } finally {
    try {
      console.log('Closing client...');
      await client.close();
    } catch (e) {
      void e;
      // ignore
    }
  }
}

main().catch((e) => {
  console.error('Fatal error in demo client:', e);
  process.exit(1);
});
