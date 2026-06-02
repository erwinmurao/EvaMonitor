/* Material Picker Component */
function createMaterialPicker(container, materials, onSelect) {
  container.innerHTML = '';
  container.className = 'material-grid';

  for (const mat of materials) {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.dataset.id = mat.id;

    const code = document.createElement('div');
    code.className = 'material-code';
    code.textContent = mat.code;

    const color = document.createElement('div');
    color.className = 'material-color';
    color.textContent = mat.color;

    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = '#d1d5db';

    const size = document.createElement('div');
    size.className = 'material-size';
    size.textContent = mat.size_type;

    card.appendChild(swatch);
    card.appendChild(code);
    card.appendChild(color);
    card.appendChild(size);

    card.onclick = () => {
      container.querySelectorAll('.material-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      onSelect(mat);
    };

    container.appendChild(card);
  }
}

export { createMaterialPicker };
