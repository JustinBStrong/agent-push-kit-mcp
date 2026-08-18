import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectDirectory = resolve(packageDirectory, '..', '..');
const repositoryDirectory = resolve(projectDirectory, '..');
await mkdir(resolve(packageDirectory, 'src'), { recursive: true });
await cp(
  resolve(repositoryDirectory, 'cam', 'src', 'agent-push-kit', 'agent-push-kit.openapi.json'),
  resolve(packageDirectory, 'src', 'openapi.generated.json'),
);
await cp(resolve(projectDirectory, 'mcp', 'server.json'), resolve(packageDirectory, 'server.json'));
