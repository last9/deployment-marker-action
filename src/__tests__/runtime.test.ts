/**
 * Tests that the Node runtime the action declares stays supported and consistent
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Node 20 is end-of-life and will not receive TLS trust-store fixes (#8)
const MIN_SUPPORTED_NODE_MAJOR = 24;

const repoRoot = join(__dirname, '..', '..');

function actionRuntimeMajor(): number {
  const actionYml = readFileSync(join(repoRoot, 'action.yml'), 'utf8');
  const match = actionYml.match(/^\s*using:\s*['"]?node(\d+)['"]?\s*$/m);
  if (!match?.[1]) {
    throw new Error('action.yml has no runs.using: nodeNN entry');
  }
  return Number(match[1]);
}

function enginesNodeMajor(): number {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  const match = /^>=(\d+)\./.exec(pkg.engines.node);
  if (!match?.[1]) {
    throw new Error(`unexpected engines.node: ${pkg.engines.node}`);
  }
  return Number(match[1]);
}

describe('action runtime', () => {
  it('runs on a supported Node major', () => {
    expect(actionRuntimeMajor()).toBeGreaterThanOrEqual(MIN_SUPPORTED_NODE_MAJOR);
  });

  it('matches package.json engines.node', () => {
    expect(enginesNodeMajor()).toBe(actionRuntimeMajor());
  });
});
