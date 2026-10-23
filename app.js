'use strict';
const DENOMS = [1, 5, 10, 20, 50, 100];
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

const state = {};
function reset(mode) {
  state.mode = mode || state.mode || 'add';
  state.boxes = [{ target: 0, items: [] }, { target: 0, items: [] }];
  state.breakdown = 'none';
  state.solved = false;
  render();
}

// Split a number into parts according to the chosen breakdown level.
function parts(n, level) {
  if (level === 'none') return n > 0 ? [n] : [];
  const out = [];
  const tens = Math.floor(n / 10);
  for (let i = 0; i < tens; i++) out.push(10);
  let rest = n % 10;
  if (level !== '10') {
    if (rest >= 5) { out.push(5); rest -= 5; }
    if (level === '1') { for (let i = 0; i < rest; i++) out.push(1); rest = 0; }
  }
  if (rest > 0) out.push(rest);
  return out;
}

function token(v, small) {
  const d = document.createElement('div');
  d.className = `token v${v}` + (small ? ' sm' : '');
  d.textContent = v;
  return d;
}

function maxFor(i) {
  // In subtraction the second container can't take away more than the first.
  if (state.mode === 'sub' && i === 1) return sum(state.boxes[0].items);
  return Infinity;
}

function addItem(i, v) {
  const b = state.boxes[i];
  const cap = Math.min(b.target, maxFor(i));
  if (!b.target) return flash(i, 'Enter the number for this container first.');
  if (i === 1 && !isFull(0)) return flash(i, 'Fill the first container first.');
  if (sum(b.items) + v > cap) return flash(i, `That would go over ${cap}. Try a smaller piece!`);
  b.items.push(v);
  state.solved = false;
  render();
}

function isFull(i) {
  const b = state.boxes[i];
  return b.target > 0 && sum(b.items) === b.target;
}

function flash(i, msg) {
  const el = document.querySelectorAll('.container')[i];
  document.getElementById('message').textContent = msg;
  if (el) { el.classList.remove('reject'); void el.offsetWidth; el.classList.add('reject'); }
}

function render() {
  const add = state.mode === 'add';
  document.getElementById('mode-add').classList.toggle('active', add);
  document.getElementById('mode-sub').classList.toggle('active', !add);
  document.getElementById('message').textContent = '';

  const wrap = document.getElementById('containers');
  wrap.innerHTML = '';
  wrap.appendChild(renderBox(0));
  if (isFull(0)) {
    const op = document.createElement('div');
    op.className = 'op';
    op.textContent = add ? '+' : '−';
    wrap.appendChild(op);
    wrap.appendChild(renderBox(1));
  }
  document.getElementById('step1-title').textContent = !isFull(0)
    ? 'Step 1: Fill the first container'
    : (add ? 'Step 2: Add another container' : 'Step 2: Choose how many to take away');

  const ready = isFull(0) && isFull(1);
  document.getElementById('solve').hidden = !ready;
  if (ready) renderSolve();
}

function renderBox(i) {
  const b = state.boxes[i];
  const el = document.createElement('div');
  el.className = 'container' + (isFull(i) ? ' full' : '');
  const lab = document.createElement('label');
  lab.textContent = 'Goal number: ';
  const inp = document.createElement('input');
  inp.type = 'number'; inp.min = 1; inp.max = 999;
  inp.value = b.target || '';
  inp.setAttribute('aria-label', 'Goal number for container ' + (i + 1));
  inp.addEventListener('change', () => {
    let n = Math.max(0, Math.min(999, parseInt(inp.value, 10) || 0));
    if (i === 1 && state.mode === 'sub') n = Math.min(n, sum(state.boxes[0].items));
    b.target = n;
    if (sum(b.items) > n) b.items = [];
    state.solved = false;
    render();
  });
  lab.appendChild(inp);
  el.appendChild(lab);

  const drop = document.createElement('div');
  drop.className = 'drop';
  drop.setAttribute('aria-label', 'Container ' + (i + 1));
  b.items.forEach((v, idx) => {
    const t = token(v, true);
    t.title = 'Click to remove';
    t.addEventListener('click', () => { b.items.splice(idx, 1); state.solved = false; render(); });
    drop.appendChild(t);
  });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('over'); });
  drop.addEventListener('dragleave', () => el.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    const v = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (DENOMS.includes(v)) addItem(i, v);
  });
  el.appendChild(drop);

  const total = document.createElement('div');
  total.className = 'total';
  total.textContent = `${sum(b.items)} / ${b.target || '?'}`;
  el.appendChild(total);
  return el;
}

function renderBreakdown(i, level) {
  const n = sum(state.boxes[i].items);
  const ps = parts(n, level);
  const box = document.createElement('div');
  box.className = 'bd-box';
  const title = document.createElement('strong');
  title.textContent = `Container ${i + 1}: ${n}`;
  box.appendChild(title);
  box.appendChild(document.createElement('br'));
  ps.forEach((p) => {
    const g = document.createElement('div');
    g.className = 'group';
    // Show a manipulative for exact denominations, else a plain number badge.
    const t = DENOMS.includes(p) ? token(p, true) : token(1, true);
    if (!DENOMS.includes(p)) { t.textContent = p; t.className = 'token sm v1'; }
    g.appendChild(t);
    box.appendChild(g);
  });
  const eq = document.createElement('div');
  eq.className = 'eq';
  eq.textContent = `${n} = ${ps.length ? ps.join(' + ') : 0}`;
  box.appendChild(eq);
  return box;
}

function renderSolve() {
  const a = sum(state.boxes[0].items), b = sum(state.boxes[1].items);
  const add = state.mode === 'add';
  const result = add ? a + b : a - b;
  document.querySelectorAll('[data-bd]').forEach((btn) =>
    btn.classList.toggle('active', btn.dataset.bd === state.breakdown));
  const bd = document.getElementById('breakdown');
  bd.innerHTML = '';
  bd.appendChild(renderBreakdown(0, state.breakdown));
  bd.appendChild(renderBreakdown(1, state.breakdown));
  document.getElementById('numberline').innerHTML = numberLine(a, b, add);
  document.getElementById('equation').textContent = `${a} ${add ? '+' : '−'} ${b} = `;
  const sv = document.getElementById('subvisual');
  sv.hidden = add;
  if (!add) renderTakeAway(a, b);
  const fb = document.getElementById('feedback');
  fb.textContent = ''; fb.className = '';
  document.getElementById('answer').value = '';
}

// SVG number line. Addition hops forward from a; subtraction hops back from a.
function numberLine(a, b, add) {
  const end = add ? a + b : a - b;
  const lo = add ? a : end, hi = add ? end : a;
  const max = add ? end : a;
  const W = Math.max(600, max * 6 + 60), pad = 30, y = 90;
  const x = (n) => pad + (n / Math.max(max, 1)) * (W - 2 * pad);
  let svg = `<svg width="${W}" height="140" viewBox="0 0 ${W} 140" role="img" aria-label="Number line">`;
  svg += `<line x1="${x(0)}" y1="${y}" x2="${x(max)}" y2="${y}" stroke="#334" stroke-width="2"/>`;
  const step = max <= 30 ? 1 : max <= 100 ? 5 : 10;
  const marks = new Set();
  for (let n = 0; n <= max; n += step) marks.add(n);
  [a, end].forEach((n) => marks.add(n));
  // Hop sizes follow the 10s / 5s / 1s breakdown of the second number.
  const level = state.breakdown === 'none' ? '1' : state.breakdown;
  const hops = parts(b, level === '1' ? '1' : level);
  const stops = [a];
  hops.forEach((h) => stops.push(stops[stops.length - 1] + (add ? h : -h)));
  stops.forEach((n) => marks.add(n));
  [...marks].sort((p, q) => p - q).forEach((n) => {
    const big = n === a || n === end;
    svg += `<line x1="${x(n)}" y1="${y - 6}" x2="${x(n)}" y2="${y + 6}" stroke="#334"/>`;
    if (big || n % (step * (max > 30 ? 2 : 5)) === 0 || stops.includes(n))
      svg += `<text x="${x(n)}" y="${y + 24}" font-size="12" text-anchor="middle" font-weight="${big ? 'bold' : 'normal'}">${n}</text>`;
  });
  const colors = ['#29a36a', '#f3a712', '#e4572e'];
  for (let k = 0; k < stops.length - 1; k++) {
    const x1 = x(stops[k]), x2 = x(stops[k + 1]), mid = (x1 + x2) / 2;
    const c = colors[hops[k] >= 10 ? 0 : hops[k] >= 5 ? 1 : 2];
    svg += `<path d="M${x1} ${y} Q${mid} ${y - 60} ${x2} ${y}" fill="none" stroke="${c}" stroke-width="2.5"/>`;
    svg += `<text x="${mid}" y="${y - 38}" font-size="12" text-anchor="middle" fill="${c}">${add ? '+' : '−'}${hops[k]}</text>`;
  }
  svg += `<circle cx="${x(a)}" cy="${y}" r="6" fill="#3b6fd4"/><circle cx="${x(end)}" cy="${y}" r="6" fill="#d33"/>`;
  svg += '</svg>';
  void lo; void hi;
  return svg;
}

// Subtraction visual: the first number as unit cells grouped in tens; the last b are crossed out.
function renderTakeAway(a, b) {
  const wrap = document.getElementById('takeaway');
  wrap.innerHTML = '';
  for (let start = 0; start < a; start += 10) {
    const g = document.createElement('div');
    g.className = 'tens';
    for (let k = start; k < Math.min(start + 10, a); k++) {
      const c = document.createElement('span');
      c.className = 'cell' + (k >= a - b ? ' gone' : '');
      g.appendChild(c);
    }
    wrap.appendChild(g);
  }
  const cap = document.createElement('p');
  cap.textContent = `Start with ${a}, cross out ${b}. How many are left?`;
  wrap.appendChild(cap);
}

function init() {
  const tokens = document.getElementById('tokens');
  DENOMS.forEach((v) => {
    const t = token(v);
    t.draggable = true;
    t.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', String(v)));
    t.addEventListener('click', () => {
      const i = isFull(0) ? 1 : 0;
      addItem(i, v);
    });
    tokens.appendChild(t);
  });
  document.getElementById('mode-add').onclick = () => reset('add');
  document.getElementById('mode-sub').onclick = () => reset('sub');
  document.getElementById('reset').onclick = () => reset();
  document.querySelectorAll('[data-bd]').forEach((btn) => btn.addEventListener('click', () => {
    state.breakdown = btn.dataset.bd;
    renderSolve();
  }));
  document.getElementById('check').onclick = () => {
    const a = sum(state.boxes[0].items), b = sum(state.boxes[1].items);
    const want = state.mode === 'add' ? a + b : a - b;
    const got = parseInt(document.getElementById('answer').value, 10);
    const fb = document.getElementById('feedback');
    const ok = got === want;
    fb.textContent = ok ? '🎉 Correct!' : 'Not quite – try breaking it down!';
    fb.className = ok ? 'ok' : 'no';
  };
  reset('add');
}
init();
