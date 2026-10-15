// Multiple xterm.js sessions, each with its own websocket to jump01.
const host = () => document.getElementById('term-host');
let sessions = [];
let active = null;
let seq = 0;
let onChange = () => {};

export function initTerminals(changed) { onChange = changed; window.addEventListener('resize', fitActive); }
export const list = () => sessions.map((s) => ({ id: s.id, name: s.name, alive: s.alive, active: s.id === active }));

function connect(s) {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/term`);
  s.ws = ws;
  ws.onopen = () => { s.alive = true; sendSize(s); onChange(); };
  ws.onmessage = (e) => s.term.write(typeof e.data === 'string' ? e.data : '');
  ws.onclose = () => { s.alive = false; s.term.write('\r\n\x1b[90m[disconnected — press Enter to reconnect]\x1b[0m\r\n'); onChange(); };
}

function sendSize(s) {
  if (s.ws?.readyState === WebSocket.OPEN) s.ws.send(JSON.stringify({ t: 'r', c: s.term.cols, r: s.term.rows }));
}

export function newSession() {
  const id = ++seq;
  const el = document.createElement('div');
  el.className = 'term-pane';
  host().appendChild(el);
  const term = new window.Terminal({
    cursorBlink: true, fontSize: 13.5, scrollback: 5000, allowProposedApi: false,
    fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, Menlo, Consolas, monospace',
    theme: { background: '#0f1115', foreground: '#e3e6eb', cursor: '#4f9cf7', selectionBackground: '#2a4a77' },
  });
  const fit = new window.FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(el);
  const s = { id, name: `jump01 #${id}`, term, fit, el, ws: null, alive: false };
  term.onData((d) => {
    if (!s.alive) { if (d === '\r') { term.write('\r\n'); connect(s); } return; }
    s.ws.send(JSON.stringify({ t: 'i', d }));
  });
  term.onResize(() => sendSize(s));
  sessions.push(s);
  activate(id);
  connect(s);
  return id;
}

export function activate(id) {
  active = id;
  for (const s of sessions) s.el.classList.toggle('hidden', s.id !== id);
  fitActive();
  sessions.find((s) => s.id === id)?.term.focus();
  onChange();
}

export function close(id) {
  const s = sessions.find((x) => x.id === id);
  if (!s) return;
  s.ws?.close();
  s.term.dispose();
  s.el.remove();
  sessions = sessions.filter((x) => x.id !== id);
  if (active === id) active = sessions.at(-1)?.id ?? null;
  if (active) activate(active); else onChange();
}

export function rename(id, name) { const s = sessions.find((x) => x.id === id); if (s && name) { s.name = name; onChange(); } }

export function fitActive() {
  const s = sessions.find((x) => x.id === active);
  if (!s || !s.el.offsetParent) return;
  requestAnimationFrame(() => { try { s.fit.fit(); } catch {} });
}

export const focusActive = () => sessions.find((x) => x.id === active)?.term.focus();
export const count = () => sessions.length;
