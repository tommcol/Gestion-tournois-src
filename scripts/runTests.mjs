import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Le shell Windows ne développe pas « *.test.mjs » comme le shell Linux.
// Fournir les fichiers séparément, sans shell, sur tous les ordinateurs.
const projectDir = fileURLToPath(new URL('../', import.meta.url));
const testDir = join(projectDir, 'tests');
const files = readdirSync(testDir).filter(name => name.endsWith('.test.mjs')).sort().map(name => join(testDir, name));
if (!files.length) throw new Error('Aucun test trouvé.');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { cwd: projectDir, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
