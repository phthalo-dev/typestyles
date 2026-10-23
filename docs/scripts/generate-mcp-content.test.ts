import { it } from 'vite-plus/test';
import { writeMcpContentBundle } from '../src/lib/writeMcpContentBundle';

it('writes netlify/functions/mcp-content.json', async () => {
  const outPath = await writeMcpContentBundle();
  console.log(`Wrote ${outPath}`);
});
