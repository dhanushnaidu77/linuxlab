import pty from 'node-pty';

// The ONLY command the browser terminal can run. Nothing from the client reaches argv.
const TERM_CMD = ['docker', ['exec', '-it', 'jump01', 'su', '-', 'dhan']];

export function attachTerminal(ws, { log = () => {} } = {}) {
  let p;
  try {
    p = pty.spawn(TERM_CMD[0], TERM_CMD[1], { name: 'xterm-256color', cols: 120, rows: 32, env: { PATH: process.env.PATH, TERM: 'xterm-256color' } });
  } catch (e) {
    ws.send(`\r\n\x1b[31mCould not start terminal: ${e.message}\x1b[0m\r\n`);
    ws.close();
    return;
  }
  p.onData((d) => { if (ws.readyState === ws.OPEN) ws.send(d); });
  p.onExit(({ exitCode }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(`\r\n\x1b[33m[session ended (exit ${exitCode}). Is the lab running? Press Enter to reconnect]\x1b[0m\r\n`);
      ws.close(4000, 'pty exited');
    }
  });
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.t === 'i' && typeof msg.d === 'string') p.write(msg.d);
    else if (msg.t === 'r' && Number.isInteger(msg.c) && Number.isInteger(msg.r) && msg.c > 0 && msg.r > 0 && msg.c < 1000 && msg.r < 500) p.resize(msg.c, msg.r);
  });
  ws.on('close', () => { try { p.kill(); } catch {} log('terminal closed'); });
}
