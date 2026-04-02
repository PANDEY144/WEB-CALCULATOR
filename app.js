/* ── Calculator — app.js ── */

// ── DOM ───────────────────────────────────────────────────
const displayEl    = document.getElementById('display');
const expressionEl = document.getElementById('expression');
const historyList  = document.getElementById('history-list');
const keypad       = document.querySelector('.keypad');
const displayMain  = document.querySelector('.display');

// ── State ─────────────────────────────────────────────────
let current   = '0';   // value currently shown
let stored    = null;  // first operand
let operator  = null;  // pending operator symbol
let freshCalc = false; // true right after = pressed
let history   = [];

// ── Operator map ──────────────────────────────────────────
const OPS = { '÷': (a,b) => b === 0 ? null : a / b,
              '×': (a,b) => a * b,
              '−': (a,b) => a - b,
              '+': (a,b) => a + b };

// ── Display helpers ───────────────────────────────────────
function formatNumber(num) {
  if (isNaN(num) || num === null) return 'Error';
  // Show up to 10 significant digits, strip trailing zeros for decimals
  let s = parseFloat(num.toPrecision(10)).toString();
  // If too long, switch to exponential
  if (s.replace(/[^0-9]/g,'').length > 10) s = num.toExponential(4);
  return s;
}

function updateDisplay(val) {
  const text = String(val);
  displayEl.textContent = text;
  // Shrink font for long numbers
  if (text.length > 9)       displayEl.style.fontSize = '2.2rem';
  else if (text.length > 6)  displayEl.style.fontSize = '3rem';
  else                       displayEl.style.fontSize = '4rem';
}

function flashDisplay() {
  displayEl.classList.remove('flash');
  void displayEl.offsetWidth; // reflow
  displayEl.classList.add('flash');
  displayEl.addEventListener('animationend', () => displayEl.classList.remove('flash'), { once: true });
}

function shakeDisplay() {
  displayMain.classList.remove('shake');
  void displayMain.offsetWidth;
  displayMain.classList.add('shake');
  displayMain.addEventListener('animationend', () => displayMain.classList.remove('shake'), { once: true });
}

function setExpression(text) {
  expressionEl.textContent = text || '\u00a0';
}

// ── Operator button highlight ─────────────────────────────
function highlightOp(symbol) {
  document.querySelectorAll('.btn-op').forEach(b => {
    b.classList.toggle('active-op', b.dataset.val === symbol);
  });
}

// ── History ───────────────────────────────────────────────
function addHistory(expr, result) {
  history.unshift({ expr, result });
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  const empty = historyList.querySelector('.history-empty');
  if (empty) empty.remove();

  historyList.innerHTML = '';
  history.forEach(({ expr, result }) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `<div class="h-expr">${expr}</div><div class="h-res">${result}</div>`;
    li.addEventListener('click', () => {
      current = result;
      stored = null; operator = null; freshCalc = true;
      updateDisplay(current);
      setExpression('');
      highlightOp(null);
    });
    historyList.appendChild(li);
  });
}

// ── Core Logic ────────────────────────────────────────────
function inputNumber(val) {
  if (freshCalc) { current = val; freshCalc = false; }
  else if (current === '0' && val !== '.') current = val;
  else if (current.length >= 12) return;
  else current += val;

  updateDisplay(current);
}

function inputDot() {
  if (freshCalc) { current = '0.'; freshCalc = false; updateDisplay(current); return; }
  if (!current.includes('.')) {
    current += '.';
    updateDisplay(current);
  }
}

function inputOperator(sym) {
  freshCalc = false;

  // If we already have a stored value and operator, chain the calculation
  if (stored !== null && operator && !freshCalc) {
    const a = parseFloat(stored);
    const b = parseFloat(current);
    const res = OPS[operator](a, b);
    if (res === null) { shakeDisplay(); updateDisplay('Error'); setExpression(''); stored = null; operator = null; return; }
    const formatted = formatNumber(res);
    current = formatted;
    updateDisplay(formatted);
  }

  stored   = current;
  operator = sym;
  freshCalc = true;
  setExpression(`${stored} ${operator}`);
  highlightOp(sym);
}

function calculate() {
  if (stored === null || operator === null) return;

  const a = parseFloat(stored);
  const b = parseFloat(current);
  const res = OPS[operator](a, b);

  const exprText = `${stored} ${operator} ${current} =`;

  if (res === null) {
    shakeDisplay();
    updateDisplay('Error');
    setExpression(exprText);
    stored = null; operator = null; freshCalc = true;
    return;
  }

  const formatted = formatNumber(res);
  addHistory(exprText, formatted);
  flashDisplay();
  updateDisplay(formatted);
  setExpression(exprText);
  current   = formatted;
  stored    = null;
  operator  = null;
  freshCalc = true;
  highlightOp(null);
}

function clear() {
  current  = '0';
  stored   = null;
  operator = null;
  freshCalc = false;
  updateDisplay('0');
  setExpression('');
  highlightOp(null);
}

function toggleSign() {
  const n = parseFloat(current);
  if (isNaN(n)) return;
  current = formatNumber(n * -1);
  updateDisplay(current);
}

function percent() {
  const n = parseFloat(current);
  if (isNaN(n)) return;
  current = formatNumber(n / 100);
  updateDisplay(current);
}

// ── Button click ripple ───────────────────────────────────
function ripple(btn) {
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 200);
}

// ── Event: Keypad click ───────────────────────────────────
keypad.addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  ripple(btn);

  const { action, val } = btn.dataset;
  switch (action) {
    case 'num':     inputNumber(val); break;
    case 'dot':     inputDot();       break;
    case 'op':      inputOperator(val); break;
    case 'equals':  calculate();      break;
    case 'clear':   clear();          break;
    case 'sign':    toggleSign();     break;
    case 'percent': percent();        break;
  }
});

// ── Event: Keyboard ───────────────────────────────────────
document.addEventListener('keydown', e => {
  const key = e.key;
  if (key >= '0' && key <= '9')      { inputNumber(key); highlightKey(key); }
  else if (key === '.')              { inputDot(); }
  else if (key === '+')              { inputOperator('+'); }
  else if (key === '-')              { inputOperator('−'); }
  else if (key === '*')              { inputOperator('×'); }
  else if (key === '/')              { e.preventDefault(); inputOperator('÷'); }
  else if (key === 'Enter' || key === '=') { calculate(); }
  else if (key === 'Escape')         { clear(); }
  else if (key === 'Backspace')      { backspace(); }
  else if (key === '%')              { percent(); }
});

function backspace() {
  if (freshCalc) return;
  current = current.length > 1 ? current.slice(0, -1) : '0';
  updateDisplay(current);
}

function highlightKey(key) {
  const btn = [...document.querySelectorAll('.btn-num')].find(b => b.dataset.val === key);
  if (btn) ripple(btn);
}

// ── Init ──────────────────────────────────────────────────
updateDisplay('0');
