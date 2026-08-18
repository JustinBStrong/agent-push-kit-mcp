import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('A semantic version is required.');
const repository = 'JustinBStrong/agent-push-kit-mcp';
run('gh', ['auth', 'setup-git']);
if (spawnSync('gh', ['repo', 'view', repository], { stdio: 'ignore' }).status !== 0) {
  run('gh', ['repo', 'create', repository, '--public', '--description', 'Official MCP server for Agent Push Kit', '--disable-issues', '--disable-wiki']);
}
const temporary = await mkdtemp(resolve(tmpdir(), 'agent-push-kit-mcp-'));
const clone = resolve(temporary, 'repository');
run('git', ['clone', `https://github.com/${repository}.git`, clone]);
run('git', ['config', 'user.name', 'agent-push-kit-release'], clone);
run('git', ['config', 'user.email', 'JustinBStrong@users.noreply.github.com'], clone);
for (const entry of await readdir(clone)) {
  if (entry !== '.git') await rm(resolve(clone, entry), { recursive: true, force: true });
}
await mkdir(clone, { recursive: true });
for (const entry of await readdir(packageRoot)) {
  if (!['node_modules', 'coverage'].includes(entry)) {
    await cp(resolve(packageRoot, entry), resolve(clone, entry), { recursive: true });
  }
}
run('git', ['add', '--all'], clone);
if (spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: clone }).status !== 0) {
  run('git', ['commit', '-m', `Release Agent Push Kit MCP ${version}`], clone);
}
run('git', ['tag', '--force', `v${version}`], clone);
run('git', ['push', 'origin', 'HEAD:main'], clone);
run('git', ['push', 'origin', `v${version}`, '--force'], clone);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed.`);
}
