import { generatePassword } from './password-core.mjs';

const tool = document.querySelector('[data-password-tool]');
const output = tool.querySelector('output');
const length = tool.querySelector('#password-length');
const slider = tool.querySelector('#password-slider');
const copy = tool.querySelector('#password-copy');
const status = tool.querySelector('#password-status');
const estimate = tool.querySelector('#password-estimate');
const strength = tool.querySelector('.password-strength');
const visibility = tool.querySelector('#password-visibility');
let copyTimer;
let currentPassword = '';
let generation = 0;
let concealed = false;

function renderPassword() {
  output.textContent = concealed ? '•'.repeat(currentPassword.length) : currentPassword;
  visibility.textContent = concealed ? 'Mostrar contraseña' : 'Ocultar contraseña';
  visibility.setAttribute('aria-pressed', String(concealed));
}

function generate() {
  generation++;
  clearTimeout(copyTimer);
  copy.textContent = 'Copiar contraseña';
  try {
    const options = Object.fromEntries([...tool.querySelectorAll('input[type="checkbox"]')].map(input => [input.name, input.checked]));
    const result = generatePassword(Number(length.value), options);
    currentPassword = result.password;
    renderPassword();
    visibility.disabled = false;
    copy.disabled = false;
    status.textContent = 'Nueva contraseña generada.';
    const level = result.bits < 50 ? 0 : result.bits < 75 ? 1 : result.bits < 100 ? 2 : 3;
    strength.dataset.level = String(level);
    estimate.textContent = `Aleatoriedad estimada: ${['baja', 'media', 'alta', 'muy alta'][level]}. ${Math.floor(result.bits)} bits de entropía.`;
  } catch (error) {
    currentPassword = ''; renderPassword(); copy.disabled = true; visibility.disabled = true;
    status.textContent = error.message; estimate.textContent = ''; delete strength.dataset.level;
  }
}

function syncLength(value) {
  const bounded = Math.min(64, Math.max(4, Math.round(Number(value) || 16)));
  length.value = bounded; slider.value = bounded; generate();
}
slider.addEventListener('input', () => syncLength(slider.value));
length.addEventListener('input', () => {
  const value = Number(length.value);
  if (Number.isInteger(value) && value >= 4 && value <= 64) slider.value = String(value);
  generate();
});
length.addEventListener('change', () => syncLength(length.value));
tool.querySelectorAll('input[type="checkbox"]').forEach(input => input.addEventListener('change', generate));
tool.querySelector('#password-refresh').addEventListener('click', generate);
visibility.addEventListener('click', () => { concealed = !concealed; renderPassword(); });
copy.addEventListener('click', async () => {
  const password = currentPassword;
  if (!password) return;
  const copiedGeneration = generation;
  clearTimeout(copyTimer);
  copy.disabled = true;
  try {
    await navigator.clipboard.writeText(password);
    if (copiedGeneration !== generation) return;
    status.textContent = 'Contraseña copiada.'; copy.textContent = '¡Copiada!';
    copyTimer = setTimeout(() => { copy.textContent = 'Copiar contraseña'; }, 2200);
  } catch (_) {
    if (copiedGeneration !== generation) return;
    if (concealed) {
      status.textContent = 'No se pudo copiar automáticamente. Muestra la contraseña si quieres copiarla manualmente.';
      return;
    }
    const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(output);
    selection.removeAllRanges(); selection.addRange(range);
    status.textContent = 'No se pudo copiar automáticamente. La contraseña está seleccionada para copiarla manualmente.';
  } finally {
    if (copiedGeneration === generation) copy.disabled = !currentPassword;
  }
});
tool.hidden = false;
generate();
