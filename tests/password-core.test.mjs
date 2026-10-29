import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePassword } from '../assets/js/password-core.mjs';

test('valida límites y rechaza opciones vacías', () => {
  for (const length of [0, 3, 65, 4.5, NaN]) assert.throws(() => generatePassword(length, { numbers: true }), RangeError);
  assert.throws(() => generatePassword(16, {}), RangeError);
});

test('cada combinación de opciones contiene todos los grupos seleccionados', () => {
  const groups = ['uppercase', 'lowercase', 'numbers', 'symbols'];
  const patterns = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/];
  for (let mask = 1; mask < 16; mask++) {
    const options = Object.fromEntries(groups.map((key, i) => [key, Boolean(mask & 1 << i)]));
    for (const length of [4, 16, 64]) {
      for (let run = 0; run < 30; run++) {
        const { password, bits } = generatePassword(length, options);
        assert.equal(password.length, length);
        assert.ok(Number.isFinite(bits) && bits > 0);
        patterns.forEach((pattern, index) => assert.equal(pattern.test(password), options[groups[index]]));
      }
    }
  }
});

test('la exclusión de caracteres parecidos se cumple para todas las longitudes', () => {
  for (let length = 4; length <= 64; length++) {
    const { password } = generatePassword(length, { uppercase: true, lowercase: true, numbers: true, symbols: true, unambiguous: true });
    assert.doesNotMatch(password, /[0OlI1]/);
  }
});

test('la entropía refleja el espacio de combinaciones permitido', () => {
  const digits = generatePassword(16, { numbers: true });
  assert.ok(Math.abs(digits.bits - Math.log2(10 ** 16)) < 1e-10);
  const unambiguous = generatePassword(16, { numbers: true, unambiguous: true });
  assert.ok(Math.abs(unambiguous.bits - Math.log2(8 ** 16)) < 1e-10);
  assert.ok(generatePassword(32, { numbers: true }).bits > digits.bits);
});

test('descarta valores que introducirían sesgo al elegir caracteres', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  let calls = 0;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
    getRandomValues(array) { array[0] = calls++ === 0 ? 0xffffffff : 42; return array; }
  } });
  try {
    assert.equal(generatePassword(4, { numbers: true }).password, '2222');
    assert.equal(calls, 5);
  } finally { Object.defineProperty(globalThis, 'crypto', descriptor); }
});

test('rechaza la generación si falta una fuente aleatoria criptográfica', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
  try { assert.throws(() => generatePassword(16, { numbers: true }), /navegador/); }
  finally { Object.defineProperty(globalThis, 'crypto', descriptor); }
});
