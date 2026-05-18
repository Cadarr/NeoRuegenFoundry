import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const systemRoot = process.cwd();
const repoRoot = path.resolve(systemRoot, '..');
const manifestPath = path.join(systemRoot, 'system.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const packageId = manifest.id;
const version = manifest.version;

if (!packageId) throw new Error('system.json must define an id.');
if (!version) throw new Error('system.json must define a version.');
if (!manifest.manifest || !manifest.download) {
  throw new Error('system.json must define manifest and download URLs.');
}

const buildRoot = path.join(systemRoot, 'build');
const buildSystemRoot = path.join(buildRoot, packageId);
const releaseRoot = path.join(repoRoot, 'release', version);
const releaseZip = path.join(releaseRoot, `${packageId}.zip`);
const releaseManifest = path.join(releaseRoot, 'system.json');
const rootZip = path.join(systemRoot, `${packageId}.zip`);

const excluded = new Set([
  '.DS_Store',
  'build',
  'node_modules',
  'src',
  `${packageId}.zip`,
  'template.json',
]);

function copyCurrentSystem() {
  fs.rmSync(buildSystemRoot, { recursive: true, force: true });
  fs.mkdirSync(buildSystemRoot, { recursive: true });

  for (const entry of fs.readdirSync(systemRoot, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;

    const source = path.join(systemRoot, entry.name);
    const destination = path.join(buildSystemRoot, entry.name);
    fs.cpSync(source, destination, {
      recursive: true,
      filter: (src) => !src.split(path.sep).includes('node_modules'),
    });
  }
}

function zipBuild() {
  fs.rmSync(rootZip, { force: true });

  const result = spawnSync('zip', ['-r', rootZip, packageId], {
    cwd: buildRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error(`zip failed:\n${result.stderr || result.stdout}`);
  }
}

function publishRelease() {
  fs.rmSync(releaseRoot, { recursive: true, force: true });
  fs.mkdirSync(releaseRoot, { recursive: true });
  fs.copyFileSync(rootZip, releaseZip);
  fs.copyFileSync(manifestPath, releaseManifest);
}

copyCurrentSystem();
zipBuild();
publishRelease();

console.log(`Built ${packageId} ${version}`);
console.log(`Build directory: ${buildSystemRoot}`);
console.log(`Release manifest: ${releaseManifest}`);
console.log(`Release zip: ${releaseZip}`);
