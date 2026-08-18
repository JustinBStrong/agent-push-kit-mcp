import { access, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectDirectory = resolve(packageDirectory, '..', '..');
const repositoryDirectory = resolve(projectDirectory, '..');
await mkdir(resolve(packageDirectory, 'src'), { recursive: true });
await refreshWhenAvailable(
  resolve(repositoryDirectory, 'cam', 'src', 'agent-push-kit', 'agent-push-kit.openapi.json'),
  resolve(packageDirectory, 'src', 'openapi.generated.json'),
);
await refreshWhenAvailable(resolve(projectDirectory, 'mcp', 'server.json'), resolve(packageDirectory, 'server.json'));

async function refreshWhenAvailable(source, destination) {
  try {
    await access(source);
    await cp(source, destination);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await access(destination);
  }
}
