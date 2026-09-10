import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const publicRoot = join(root, 'public');
const sourceRoots = ['app', 'components', 'data', 'lib'];

function filesUnder(directory, accepted) {
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(absolute, accepted));
    else if (accepted(absolute)) output.push(absolute);
  }
  return output;
}

function hasMpegFrame(buffer) {
  let start = 0;
  if (buffer.length >= 10 && buffer.subarray(0, 3).toString('ascii') === 'ID3') {
    const size = ((buffer[6] & 0x7f) << 21) | ((buffer[7] & 0x7f) << 14) | ((buffer[8] & 0x7f) << 7) | (buffer[9] & 0x7f);
    start = 10 + size;
  }
  const end = Math.min(buffer.length - 1, start + 8192);
  for (let index = start; index < end; index += 1) {
    if (buffer[index] === 0xff && (buffer[index + 1] & 0xe0) === 0xe0) return true;
  }
  return false;
}

const mp3Files = filesUnder(join(publicRoot, 'audio'), (file) => extname(file).toLowerCase() === '.mp3');
assert.ok(mp3Files.length > 0, 'No public MP3 files were found.');
for (const file of mp3Files) {
  assert.ok(statSync(file).size > 1000, `Audio file is empty or unexpectedly small: ${relative(root, file)}`);
  assert.ok(hasMpegFrame(readFileSync(file)), `No MPEG audio frame was found: ${relative(root, file)}`);
}

const literalPaths = new Set();
for (const directory of sourceRoots.map((name) => join(root, name))) {
  for (const file of filesUnder(directory, (name) => ['.ts', '.tsx', '.js', '.mjs', '.json'].includes(extname(name)))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/["'`](\/audio\/[^"'`$]+\.mp3)["'`]/g)) literalPaths.add(match[1]);
  }
}
for (const publicPath of literalPaths) {
  const file = join(publicRoot, ...publicPath.split('/').filter(Boolean));
  assert.ok(existsSync(file), `Referenced audio file is missing: ${publicPath}`);
}

console.log(`Audio integrity checks passed: ${mp3Files.length} MP3 files and ${literalPaths.size} literal source paths.`);
