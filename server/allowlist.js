// Only loopback, the home LAN, Docker bridges and (optionally) Tailscale may talk to the console.
const RANGES = [
  ['127.0.0.0', 8],
  ['10.0.0.0', 24],
  ['172.16.0.0', 12],
];
const TAILSCALE = ['100.64.0.0', 10];

function ipv4ToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = n * 256 + Number(p);
  }
  return n;
}

function inRange(n, [base, bits]) {
  const block = 2 ** (32 - bits);
  return Math.floor(n / block) === Math.floor(ipv4ToInt(base) / block);
}

export function isAllowed(ip, { tailscale = false } = {}) {
  if (typeof ip !== 'string' || !ip) return false;
  if (ip === '::1') return true;
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  const n = ipv4ToInt(v4);
  if (n === null) return false;
  if (RANGES.some((r) => inRange(n, r))) return true;
  return tailscale && inRange(n, TAILSCALE);
}
