export class AuthError extends Error {}

export async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (res.status === 401 && path !== '/api/login') throw new AuthError('login required');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Persistent event stream with backoff reconnect.
export function connectEvents(onEvent, onStatus) {
  let delay = 1000;
  const open = () => {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/events`);
    ws.onopen = () => { delay = 1000; onStatus(true); };
    ws.onmessage = (e) => { try { onEvent(JSON.parse(e.data)); } catch {} };
    ws.onclose = () => { onStatus(false); setTimeout(open, delay); delay = Math.min(delay * 2, 15000); };
  };
  open();
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
