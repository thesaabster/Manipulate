'use strict';

const freeColors = ['red', 'blue', 'green'];
const freeValues = [100, 10, 5, 1];
const freeState = { color: 'red', pieces: [], removed: [], question: null };
const freeEl = (id) => document.getElementById(id);
const freeSum = (items) => items.reduce((total, item) => total + item.value, 0);

function resetFree() {
  freeState.color = 'red';
  freeState.pieces = [];
  freeState.removed = [];
  freeState.question = null;
  freeEl('free-question').hidden = true;
  freeEl('free-answer').value = '';
  freeEl('free-feedback').textContent = '';
  renderFree();
}

function renderFree() {
  freeEl('free-colors').replaceChildren();
  freeColors.forEach((color) => {
    const button = document.createElement('button');
    button.className = `free-color ${color}` + (freeState.color === color ? ' active' : '');
    button.textContent = color[0].toUpperCase() + color.slice(1);
    button.setAttribute('aria-pressed', String(freeState.color === color));
    button.onclick = () => { freeState.color = color; renderFree(); };
    freeEl('free-colors').appendChild(button);
  });

  freeEl('free-palette').replaceChildren();
  freeValues.forEach((value) => {
    const button = document.createElement('button');
    button.className = `free-source ${freeState.color}`;
    button.textContent = value;
    button.setAttribute('aria-label', `Add ${value} ${freeState.color}`);
    enableFreeDrag(button, 'source', () => addFreePiece(value));
    freeEl('free-palette').appendChild(button);
  });

  freeEl('free-total').textContent = `In the jar: ${freeSum(freeState.pieces)}`;
  freeEl('free-empty').hidden = freeState.pieces.length > 0;
  freeEl('free-pieces').replaceChildren();
  freeState.pieces.forEach((piece, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'free-piece';
    const button = document.createElement('button');
    button.className = `free-piece-button ${piece.color}`;
    button.setAttribute('aria-label', `Remove ${piece.color} group of ${piece.value}`);
    button.appendChild(freeGroup(piece.value));
    enableFreeDrag(button, 'piece', () => removeFreePiece(index));
    wrapper.appendChild(button);
    if (piece.value > 1) {
      const split = document.createElement('button');
      split.className = 'free-split';
      split.textContent = 'Split';
      split.setAttribute('aria-label', `Split ${piece.color} group of ${piece.value}`);
      split.onclick = () => splitFreePiece(index);
      wrapper.appendChild(split);
    }
    freeEl('free-pieces').appendChild(wrapper);
  });

  freeEl('free-removed-pieces').replaceChildren();
  freeState.removed.forEach((piece) => {
    const group = document.createElement('div');
    group.className = `free-removed-piece ${piece.color}`;
    group.setAttribute('aria-label', `${piece.value} taken away in ${piece.color}`);
    group.appendChild(freeGroup(piece.value));
    freeEl('free-removed-pieces').appendChild(group);
  });
  freeEl('free-removed-total').textContent = `Taken away: ${freeSum(freeState.removed)}`;
}

function freeGroup(value) {
  const group = document.createElement('span');
  group.className = `free-group group-${value}`;
  if (value === 1) {
    group.classList.add('free-unit');
    return group;
  }
  const label = document.createElement('span');
  label.className = 'free-group-label';
  label.textContent = value;
  group.appendChild(label);
  const childValue = value === 100 ? 10 : value === 10 ? 5 : 1;
  for (let i = 0; i < value / childValue; i++) group.appendChild(freeGroup(childValue));
  return group;
}

function addFreePiece(value) {
  freeState.pieces.push({ value, color: freeState.color });
  freeChanged();
}

function removeFreePiece(index) {
  const [piece] = freeState.pieces.splice(index, 1);
  freeState.removed.push({ value: piece.value, color: freeState.color, originalColor: piece.color });
  freeChanged();
}

function splitFreePiece(index) {
  const piece = freeState.pieces[index];
  const value = piece.value === 100 ? 10 : piece.value === 10 ? 5 : 1;
  const children = Array.from({ length: piece.value / value }, () => ({ value, color: piece.color }));
  freeState.pieces.splice(index, 1, ...children);
  freeChanged();
}

function freeChanged() {
  freeEl('free-feedback').textContent = '';
  renderFree();
}

function enableFreeDrag(button, kind, action) {
  let drag = null;
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, moved: false };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', (event) => {
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) drag.moved = true;
    if (drag.moved) button.classList.add('dragging');
  });
  button.addEventListener('pointerup', (event) => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    button.classList.remove('dragging');
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const inJar = target && freeEl('free-jar').contains(target);
    if (!moved || (kind === 'source' ? inJar : !inJar && target)) action();
  });
  button.addEventListener('pointercancel', () => { drag = null; button.classList.remove('dragging'); });
  button.addEventListener('click', (event) => { if (event.detail === 0) action(); });
}

function startFreeQuestion(operation) {
  resetFree();
  const a = 20 + Math.floor(Math.random() * 80);
  const b = operation === 'add' ? 10 + Math.floor(Math.random() * 90) : 1 + Math.floor(Math.random() * a);
  freeState.question = { operation, a, b };
  freeEl('free-question').hidden = false;
  freeEl('free-prompt').textContent = operation === 'add'
    ? `${a} + ${b}: Add ${a} in red and ${b} in blue to the jar.`
    : `${a} − ${b}: Add ${a} in red, then select blue and take away ${b}. Split groups if needed.`;
}

freeEl('mode-free').onclick = () => {
  freeEl('palette').hidden = true;
  freeEl('steps').hidden = true;
  freeEl('number-line-mode').hidden = true;
  freeEl('free-mode').hidden = false;
  freeEl('mode-add').classList.remove('active');
  freeEl('mode-sub').classList.remove('active');
  freeEl('mode-number-line').classList.remove('active');
  freeEl('mode-free').classList.add('active');
  resetFree();
};
freeEl('free-add-question').onclick = () => startFreeQuestion('add');
freeEl('free-sub-question').onclick = () => startFreeQuestion('sub');
freeEl('free-check').onclick = () => {
  const { operation, a, b } = freeState.question;
  const red = freeSum(freeState.pieces.filter((piece) => piece.color === 'red'));
  const blue = freeSum(freeState.pieces.filter((piece) => piece.color === 'blue'));
  const green = freeSum(freeState.pieces.filter((piece) => piece.color === 'green'));
  const removed = freeSum(freeState.removed);
  const setup = operation === 'add'
    ? red === a && blue === b && green === 0
    : blue === 0 && green === 0 && red + removed === a && removed === b &&
      freeState.removed.every((piece) => piece.color === 'blue' && piece.originalColor === 'red');
  const answer = freeEl('free-answer').value.trim();
  freeEl('free-feedback').textContent = !setup
    ? 'Check the pieces and colors in your jar first.'
    : answer === '' || Number(answer) !== (operation === 'add' ? a + b : a - b)
      ? 'The jar is set up! Try the answer again.'
      : '🎉 Correct! Your jar and answer are right.';
};
