/**
 * Tests that the Node runtime the action declares stays supported and consistent
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Node 20 is end-of-life and will not receive TLS trust-store fixes (#8)
const MIN_SUPPORTED_NODE_MAJOR = 24;

// First 24.x release that rejects the compromised eMudhra chains
// (nodejs/node#66871, 01acf0ee74) (#8)
const MIN_TLS_FIXED_NODE = '24.22.1';

const repoRoot = join(__dirname, '..', '..');

function readRepoFile(name: string): string {
  return readFileSync(join(repoRoot, name), 'utf8');
}

function actionRuntimeMajor(): number {
  const match = readRepoFile('action.yml').match(/^\s*using:\s*['"]?node(\d+)['"]?\s*$/m);
  if (!match?.[1]) {
    throw new Error('action.yml has no runs.using: nodeNN entry');
  }
  return Number(match[1]);
}

function enginesNodeMinimum(): string {
  const pkg = JSON.parse(readRepoFile('package.json'));
  const match = /^>=(\d+\.\d+\.\d+)$/.exec(pkg.engines.node);
  if (!match?.[1]) {
    throw new Error(`unexpected engines.node: ${pkg.engines.node}`);
  }
  return match[1];
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

describe('action runtime', () => {
  it('runs on a supported Node major', () => {
    expect(actionRuntimeMajor()).toBeGreaterThanOrEqual(MIN_SUPPORTED_NODE_MAJOR);
  });

  it('matches package.json engines.node', () => {
    expect(Number(enginesNodeMinimum().split('.')[0])).toBe(actionRuntimeMajor());
  });

  it('requires a Node release with the eMudhra TLS blocklist', () => {
    expect(compareVersions(enginesNodeMinimum(), MIN_TLS_FIXED_NODE)).toBeGreaterThanOrEqual(0);
  });

  it('pins .nvmrc to the engines.node minimum', () => {
    expect(readRepoFile('.nvmrc').trim()).toBe(enginesNodeMinimum());
  });

  it('keeps package-lock.json engines.node in sync', () => {
    const lock = JSON.parse(readRepoFile('package-lock.json'));
    const pkg = JSON.parse(readRepoFile('package.json'));
    expect(lock.packages[''].engines.node).toBe(pkg.engines.node);
  });
});

describe('compareVersions', () => {
  it.each([
    ['24.22.1', '24.22.1', 0],
    ['24.22.0', '24.22.1', -1],
    ['24.22.2', '24.22.1', 1],
    ['24.21.9', '24.22.1', -1],
    ['25.0.0', '24.22.1', 1]
  ])('compares %s to %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });
});
