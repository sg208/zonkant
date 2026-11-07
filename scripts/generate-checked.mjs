// Usage: node scripts/generate-checked.mjs [nuxt generate args]
// Runs `nuxt generate`, mirrors its output, then fails on unallowlisted WARN lines.
import { spawn } from 'node:child_process';
import { checkOutput } from './check-build-warnings.mjs';

const chunks = [];
const child = spawn('nuxt', ['generate', ...process.argv.slice(2)], {
  stdio: ['inherit', 'pipe', 'pipe'],
});

// WHY: mirror live so the build log stays readable, and buffer for the WARN scan
for (const [stream, target] of [
  [child.stdout, process.stdout],
  [child.stderr, process.stderr],
]) {
  stream.on('data', (chunk) => {
    chunks.push(chunk);
    target.write(chunk);
  });
}

child.on('error', (error) => {
  process.stderr.write(`Could not start nuxt: ${error.message}\n`);
  process.exit(1);
});

child.on('close', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const result = checkOutput(Buffer.concat(chunks).toString('utf8'));
  if (result.ok) return;
  process.stderr.write(`\n${result.message}\n`);
  process.exit(1);
});
