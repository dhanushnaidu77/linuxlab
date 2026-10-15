import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed } from '../server/allowlist.js';

test('allows loopback, LAN /24 and docker ranges', () => {
  for (const ip of ['127.0.0.1', '::1', '::ffff:127.0.0.1', '10.0.0.5', '::ffff:10.0.0.250', '172.18.0.1'])
    assert.equal(isAllowed(ip), true, ip);
});

test('denies everything else', () => {
  for (const ip of ['10.0.1.5', '8.8.8.8', '192.168.1.4', '::ffff:8.8.8.8', '2601:246::1', '', undefined, 'garbage', '10.0.0'])
    assert.equal(isAllowed(ip), false, String(ip));
});

test('tailscale range only when enabled', () => {
  assert.equal(isAllowed('100.107.93.47'), false);
  assert.equal(isAllowed('100.107.93.47', { tailscale: true }), true);
  assert.equal(isAllowed('100.200.0.1', { tailscale: true }), false); // outside 100.64/10
});
