// Tiny, safe markdown subset for solution notes: headings, fenced code, inline code, bold, lists, paragraphs.
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

export function markdown(src) {
  const out = [];
  const lines = String(src).split('\n');
  let list = false;
  const endList = () => { if (list) { out.push('</ul>'); list = false; } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('```')) {
      endList();
      const code = [];
      while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]);
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
    } else if (/^#{1,3} /.test(l)) {
      endList();
      const n = l.match(/^#+/)[0].length;
      out.push(`<h${n}>${inline(l.slice(n + 1))}</h${n}>`);
    } else if (/^\s*[-*] /.test(l)) {
      if (!list) { out.push('<ul>'); list = true; }
      out.push(`<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`);
    } else if (!l.trim()) {
      endList();
    } else {
      endList();
      out.push(`<p>${inline(l)}</p>`);
    }
  }
  endList();
  return out.join('');
}
