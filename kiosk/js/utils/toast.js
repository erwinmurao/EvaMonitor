/* Toast Notification */
function showToast(message, type = 'success', duration = 2000) {
  const container = document.querySelector('.toast-container') || (() => {
    const c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') toast.style.background = 'var(--danger)';
  else if (type === 'warning') toast.style.background = 'var(--warning)';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), duration);
}

/* Numpad Component */
function createNumpad(containerId, onSubmit, maxLength = 4) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let value = '';
  const display = container.querySelector('.numpad-display') || (() => {
    const d = document.createElement('div');
    d.className = 'numpad-display';
    d.style.cssText = 'font-size:2.5rem;font-weight:700;text-align:center;min-height:60px;margin-bottom:16px;letter-spacing:8px;';
    container.prepend(d);
    return d;
  })();

  function updateDisplay() {
    display.textContent = '*'.repeat(value.length) || '_';
  }

  function handleKey(key) {
    if (key === 'del') {
      value = value.slice(0, -1);
    } else if (key === 'ok') {
      onSubmit(value);
      value = '';
    } else if (value.length < maxLength) {
      value += key;
    }
    updateDisplay();
  }

  container.querySelectorAll('.numpad button').forEach(btn => {
    btn.onclick = () => handleKey(btn.dataset.key);
  });

  updateDisplay();
  return { getValue: () => value, clear: () => { value = ''; updateDisplay(); } };
}

/* Stepper Component */
function createStepper(container, value = 0, min = 0, max = 99, step = 1) {
  container.innerHTML = '';
  container.className = 'stepper';

  const minusBtn = document.createElement('button');
  minusBtn.textContent = '−';
  minusBtn.className = 'btn-dark';

  const valueEl = document.createElement('span');
  valueEl.className = 'value';
  valueEl.textContent = value;

  const plusBtn = document.createElement('button');
  plusBtn.textContent = '+';
  plusBtn.className = 'btn-dark';

  function update(delta) {
    const newVal = parseInt(valueEl.textContent) + delta;
    if (newVal >= min && newVal <= max) {
      valueEl.textContent = newVal;
    }
  }

  minusBtn.onclick = () => update(-step);
  plusBtn.onclick = () => update(step);

  container.appendChild(minusBtn);
  container.appendChild(valueEl);
  container.appendChild(plusBtn);

  return {
    getValue: () => parseInt(valueEl.textContent),
    setValue: (v) => { valueEl.textContent = v; }
  };
}

export { showToast, createNumpad, createStepper };
