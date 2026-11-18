/** Tiny element builder: h('button', {class: 'x', onclick}, 'text', child) */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}

/** Tap / long-press on one element. Long-press fires after `ms` and suppresses the tap. */
export function pressable(el, { onTap, onLong, ms = 450 }) {
  let timer = null, long = false;
  const clear = () => { clearTimeout(timer); timer = null; };
  el.addEventListener('pointerdown', () => { long = false; timer = setTimeout(() => { long = true; timer = null; onLong?.(); }, ms); });
  el.addEventListener('pointerup', () => { if (timer) { clear(); if (!long) onTap?.(); } });
  el.addEventListener('pointerleave', clear);
  el.addEventListener('pointercancel', clear);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  return el;
}
