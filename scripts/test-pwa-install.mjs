import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function pngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  assert.equal(signature, '89504e470d0a1a0a', 'Expected a valid PNG signature.');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const files = {
  icon192: new URL('../public/icons/darlugha-192.png', import.meta.url),
  icon512: new URL('../public/icons/darlugha-512.png', import.meta.url),
  maskable512: new URL('../public/icons/darlugha-maskable-512.png', import.meta.url),
  apple180: new URL('../public/icons/darlugha-apple-touch.png', import.meta.url),
};

for (const [name, expectedSize] of [['icon192', 192], ['icon512', 512], ['maskable512', 512], ['apple180', 180]]) {
  const dimensions = pngDimensions(await readFile(files[name]));
  assert.deepEqual(dimensions, { width: expectedSize, height: expectedSize }, `${name} has the wrong dimensions.`);
}

const [manifest, serviceWorker, runtime, button, home, dashboard, layout] = await Promise.all([
  readFile(new URL('../app/manifest.ts', import.meta.url), 'utf8'),
  readFile(new URL('../public/sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../components/pwa/PwaRuntime.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../components/pwa/InstallAppButton.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/dashboard/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8'),
]);

assert.match(manifest, /display: 'standalone'/);
assert.match(manifest, /darlugha-192\.png/);
assert.match(manifest, /darlugha-maskable-512\.png/);
assert.match(serviceWorker, /request\.mode === 'navigate'/, 'Authenticated HTML pages should not be cached.');
assert.match(serviceWorker, /url\.pathname\.startsWith\('\/api\/'\)/, 'API responses should not be cached.');
assert.match(runtime, /beforeinstallprompt/);
assert.match(runtime, /serviceWorker\.register\('\/sw\.js'/);
assert.match(button, /Add to Home Screen/, 'iPhone installation instructions should be available.');
assert.match(home, /<InstallAppButton locale="en"/);
assert.match(dashboard, /<InstallAppButton locale="ar"/);
assert.match(layout, /<PwaRuntime \/>/);

console.log('PWA manifest, install surfaces, service worker, and icon checks passed.');
