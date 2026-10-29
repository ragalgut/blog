const characters = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

function randomIndex(size) {
  const limit = Math.floor(0x100000000 / size) * size;
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % size;
}

export function generatePassword(length, options) {
  if (!Number.isInteger(length) || length < 4 || length > 64) throw new RangeError('Elige una longitud entre 4 y 64.');
  const groups = Object.entries(characters).filter(([key]) => options[key]).map(([, chars]) => options.unambiguous ? chars.replace(/[0OlI1]/g, '') : chars);
  if (!groups.length) throw new RangeError('Selecciona al menos un tipo de carácter.');
  if (!globalThis.crypto?.getRandomValues) throw new Error('Tu navegador no dispone de la función necesaria para generar contraseñas seguras. Prueba con un navegador actualizado.');
  const alphabet = groups.join('');
  let password;
  // Rechazar candidatos incompletos mantiene la misma probabilidad para cada contraseña válida.
  do {
    password = Array.from({ length }, () => alphabet[randomIndex(alphabet.length)]).join('');
  } while (!groups.every(group => [...password].some(char => group.includes(char))));

  // Inclusión-exclusión: contar solo las combinaciones que contienen todos los grupos elegidos.
  let combinations = 0;
  for (let mask = 0; mask < 2 ** groups.length; mask++) {
    let excluded = 0;
    let count = 0;
    groups.forEach((group, index) => { if (mask & (1 << index)) { excluded += group.length; count++; } });
    combinations += (-1) ** count * (alphabet.length - excluded) ** length;
  }
  return { password, bits: Math.log2(combinations) };
}
