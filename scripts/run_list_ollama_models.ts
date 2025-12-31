import handler from '../src/handlers/legacy-handlers';

async function main() {
  try {
    const res = await handler.callToolHandler({ name: 'list_ollama_models', arguments: {} });
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Error running handler:', e);
    process.exitCode = 2;
  }
}

main();
