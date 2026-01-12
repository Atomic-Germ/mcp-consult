// Example: Minimal pattern for a VS Code-like client that subscribes to streaming notifications
// This is a conceptual example — adjust for your SDK/client APIs.

import { createClient } from '@modelcontextprotocol/sdk';

async function run() {
  const client = createClient({ transport: 'stdio' });

  client.onNotification('notifications/message', (n) => {
    const message = n.params?.message;
    const token = n.params?._meta?.progressToken;
    console.log(`partial (${token}):`, message);
  });

  client.onNotification('notifications/progress', (n) => {
    console.log('progress update:', n.params);
  });

  const progressToken = 'pt-' + Date.now();
  const result = await client.request(
    { method: 'tools/call', params: { name: 'consult_ollama', arguments: { model: 'gifted_knuth_145/qwen3-4b-q4_k_m:latest', prompt: 'What is the sum of all prime numbers below 50? Show your reasoning.', stream: true }, _meta: { progressToken } } },
    // result schema omitted for brevity
  );

  console.log('Final result:', result);
}

run().catch(console.error);
