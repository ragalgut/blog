const MAX_V4 = (1n << 32n) - 1n;
const PROFILES = Object.freeze({
  standard: { name: 'Estándar', min: 0, max: 32 },
  azure: { name: 'Azure IPv4', min: 2, max: 29 },
  aws: { name: 'AWS IPv4', min: 16, max: 28 }
});

function ipv4Value(text) {
  const parts = text.split('.');
  if (parts.length !== 4 || parts.some(part => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)) {
    throw new Error('IPv4 no válida. Usa cuatro octetos de 0 a 255, sin ceros iniciales.');
  }
  return parts.reduce((value, part) => (value << 8n) + BigInt(part), 0n);
}

export function parseAddress(input) {
  let text = String(input).trim();
  if (!text || text.length > 80 || /[\s%\[\]]/.test(text)) {
    throw new Error('Introduce una dirección IPv4 o IPv6 sin espacios, corchetes ni identificador de interfaz.');
  }
  if (!text.includes(':')) return { version: 4, bits: 32, value: ipv4Value(text) };
  if (text.includes('.')) {
    const colon = text.lastIndexOf(':');
    const embedded = ipv4Value(text.slice(colon + 1));
    text = text.slice(0, colon + 1) + (embedded >> 16n).toString(16) + ':' + (embedded & 65535n).toString(16);
  }
  const parts = text.split('::');
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  const groups = [...left, ...right];
  if (parts.length > 2 || groups.some(group => !/^[0-9a-f]{1,4}$/i.test(group)) ||
      (parts.length === 1 ? left.length !== 8 : groups.length >= 8)) {
    throw new Error('IPv6 no válida. Comprueba los grupos hexadecimales y utiliza «::» como máximo una vez.');
  }
  const expanded = parts.length === 2 ? [...left, ...Array(8 - groups.length).fill('0'), ...right] : left;
  return { version: 6, bits: 128, value: expanded.reduce((value, group) => (value << 16n) + BigInt('0x' + group), 0n) };
}

export function formatAddress(value, version) {
  if (version === 4) return [24n, 16n, 8n, 0n].map(shift => String((value >> shift) & 255n)).join('.');
  const groups = Array.from({ length: 8 }, (_, i) => ((value >> BigInt((7 - i) * 16)) & 65535n).toString(16));
  let bestStart = -1, bestLength = 1;
  for (let i = 0; i < 8;) {
    if (groups[i] !== '0') { i++; continue; }
    let end = i;
    while (end < 8 && groups[end] === '0') end++;
    if (end - i > bestLength) { bestStart = i; bestLength = end - i; }
    i = end;
  }
  if (bestStart === -1) return groups.join(':');
  return groups.slice(0, bestStart).join(':') + '::' + groups.slice(bestStart + bestLength).join(':');
}

export function parsePrefix(input, version) {
  const text = String(input).trim().replace(/^\//, '');
  const bits = version === 4 ? 32 : 128;
  if (version === 4 && text.includes('.')) {
    const inverse = MAX_V4 ^ ipv4Value(text);
    if ((inverse & (inverse + 1n)) !== 0n) throw new Error('La máscara debe tener todos los bits de red consecutivos.');
    return 32 - (inverse === 0n ? 0 : inverse.toString(2).length);
  }
  if (!/^\d{1,3}$/.test(text) || Number(text) > bits) {
    throw new Error(`El prefijo de IPv${version} debe estar entre /0 y /${bits}.`);
  }
  return Number(text);
}

function networkFromValue(address, prefix, version) {
  const bits = version === 4 ? 32 : 128;
  const total = 1n << BigInt(bits - prefix);
  const wildcard = total - 1n;
  const mask = ((1n << BigInt(bits)) - 1n) ^ wildcard;
  const start = address & mask;
  return { version, bits, address, prefix, start, end: start + wildcard, total, mask, wildcard,
    cidr: `${formatAddress(start, version)}/${prefix}` };
}

export function parseNetwork(input, prefixOverride) {
  const text = String(input).trim();
  if (text.length > 160) throw new Error('La dirección o red es demasiado larga.');
  const parts = text.split('/');
  if (parts.length > 2) throw new Error('Usa un único prefijo, por ejemplo 192.168.1.10/24.');
  const address = parseAddress(parts[0]);
  const prefix = parsePrefix(parts.length === 2 ? parts[1] : prefixOverride ?? address.bits, address.version);
  return networkFromValue(address.value, prefix, address.version);
}

function profileFor(name) {
  if (!Object.hasOwn(PROFILES, name)) throw new Error('Selecciona un perfil de red válido.');
  return PROFILES[name];
}

function validateProfile(network, profile) {
  const policy = profileFor(profile);
  if (profile === 'standard') return;
  if (network.version !== 4) throw new Error('Los perfiles Azure y AWS de esta herramienta son para IPv4. Usa Estándar para IPv6.');
  if (network.prefix < policy.min || network.prefix > policy.max) {
    throw new Error(`${policy.name}: el prefijo de una subred debe estar entre /${policy.min} y /${policy.max}.`);
  }
}

export function analyzeNetwork(input, profile = 'standard') {
  const network = typeof input === 'string' ? parseNetwork(input) : input;
  validateProfile(network, profile);
  let reserved = 0n, first = network.start, last = network.end, broadcast = null;
  let note = 'IPv6 no tiene broadcast. El tamaño del bloque no equivale a direcciones asignables: pueden existir reservas, como subnet-router anycast, y requisitos del proveedor.';
  if (network.version === 4) {
    if (profile !== 'standard') {
      reserved = 5n; first += 4n; last -= 1n;
      note = `${PROFILES[profile].name} reserva las primeras cuatro direcciones y la última. Cálculo para subredes convencionales; no contempla excepciones BYOIP ni reservas adicionales de servicios.`;
    } else if (network.prefix < 31) {
      reserved = 2n; first++; last--; broadcast = network.end;
      note = 'Se excluyen las direcciones de red y broadcast del rango de hosts.';
    } else if (network.prefix === 31) {
      note = 'Enlace punto a punto /31 (RFC 3021): ambas direcciones son hosts y no hay broadcast dirigido.';
    } else {
      note = 'Una /32 identifica una única dirección o ruta de host; no tiene broadcast dirigido.';
    }
  }
  return { ...network, profile, reserved, capacity: network.total - reserved, first, last, broadcast, note };
}

const SPECIAL_V4 = [
  ['255.255.255.255/32', 'Broadcast limitado'], ['0.0.0.0/32', 'No especificada'],
  ['10.0.0.0/8', 'Privada · RFC 1918'], ['172.16.0.0/12', 'Privada · RFC 1918'], ['192.168.0.0/16', 'Privada · RFC 1918'],
  ['100.64.0.0/10', 'Espacio compartido · CGNAT'], ['127.0.0.0/8', 'Loopback'], ['169.254.0.0/16', 'Enlace local'],
  ['192.0.2.0/24', 'Documentación'], ['198.51.100.0/24', 'Documentación'], ['203.0.113.0/24', 'Documentación'],
  ['198.18.0.0/15', 'Pruebas de rendimiento'], ['224.0.0.0/4', 'Multicast'], ['240.0.0.0/4', 'Reservada'],
  ['0.0.0.0/8', 'Esta red'], ['192.0.0.0/24', 'Asignaciones especiales de protocolo']
];
const SPECIAL_V6 = [
  ['::/128', 'No especificada'], ['::1/128', 'Loopback'], ['::ffff:0:0/96', 'IPv4 mapeada en IPv6'],
  ['2001:db8::/32', 'Documentación'], ['fc00::/7', 'Unicast local · ULA'], ['fe80::/10', 'Enlace local'], ['ff00::/8', 'Multicast']
];
const SPECIAL_RANGES = [...SPECIAL_V4, ...SPECIAL_V6].map(([cidr, label]) => ({ ...parseNetwork(cidr), label }));

export function classifyAddress(address) {
  const parsed = typeof address === 'string' ? parseAddress(address) : address;
  return SPECIAL_RANGES.find(range => range.version === parsed.version && parsed.value >= range.start && parsed.value <= range.end)?.label
    ?? 'Sin clasificación especial en esta herramienta';
}

export function listSubnets(parent, target, { page = 0n, pageSize = 16, profile = 'standard' } = {}) {
  const network = typeof parent === 'string' ? parseNetwork(parent) : parent;
  const prefix = parsePrefix(target, network.version);
  if (prefix < network.prefix) throw new Error(`El nuevo prefijo debe ser /${network.prefix} o mayor para dividir esta red.`);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 128) throw new Error('Tamaño de página no válido.');
  const total = 1n << BigInt(prefix - network.prefix);
  const pages = (total + BigInt(pageSize) - 1n) / BigInt(pageSize);
  page = BigInt(page);
  if (page < 0n || page >= pages) throw new Error('La página solicitada está fuera del resultado.');
  const size = 1n << BigInt(network.bits - prefix);
  const offset = page * BigInt(pageSize);
  const count = Number(total - offset < BigInt(pageSize) ? total - offset : BigInt(pageSize));
  const rows = Array.from({ length: count }, (_, i) => analyzeNetwork(networkFromValue(network.start + (offset + BigInt(i)) * size, prefix, network.version), profile));
  return { rows, total, pages, page, offset };
}

export function rangeToCIDRs(start, end, version) {
  const bits = version === 4 ? 32 : 128;
  if (start < 0n || end >= (1n << BigInt(bits)) || end < start) throw new Error('Rango IP no válido.');
  const result = [];
  while (start <= end) {
    let aligned = 0;
    while (aligned < bits && (start & (1n << BigInt(aligned))) === 0n) aligned++;
    const fits = (end - start + 1n).toString(2).length - 1;
    const hostBits = Math.min(aligned, fits);
    result.push(networkFromValue(start, bits - hostBits, version));
    start += 1n << BigInt(hostBits);
  }
  return result;
}

export function allocateVLSM(input, requests, profile = 'standard') {
  const parent = typeof input === 'string' ? parseNetwork(input) : input;
  if (parent.version !== 4) throw new Error('La planificación por número de hosts es para IPv4. Puedes dividir prefijos IPv6 desde Calculadora.');
  const policy = profileFor(profile);
  if (!Array.isArray(requests) || !requests.length || requests.length > 32) throw new Error('Añade entre 1 y 32 subredes.');
  const prepared = requests.map((request, index) => {
    const name = String(request.name ?? '').trim();
    const text = String(request.hosts).trim();
    if (!name || name.length > 80) throw new Error(`Subred ${index + 1}: escribe un nombre de 1 a 80 caracteres.`);
    if (!/^[1-9]\d{0,9}$/.test(text) || BigInt(text) > MAX_V4 - 1n) throw new Error(`${name}: indica un número entero de hosts entre 1 y 4294967294.`);
    const required = BigInt(text);
    const reserved = profile === 'standard' ? 2n : 5n;
    let size = profile === 'standard' ? 4n : 1n << BigInt(32 - policy.max);
    while (size - reserved < required) size <<= 1n;
    const prefix = 32 - (size.toString(2).length - 1);
    if (prefix < policy.min) throw new Error(`${name}: la capacidad solicitada supera el tamaño máximo de subred de ${policy.name}.`);
    return { name, required, size, prefix, index };
  }).sort((a, b) => a.size === b.size ? a.index - b.index : a.size > b.size ? -1 : 1);
  let cursor = parent.start;
  const rows = prepared.map(request => {
    const start = ((cursor + request.size - 1n) / request.size) * request.size;
    const subnet = analyzeNetwork(networkFromValue(start, request.prefix, 4), profile);
    if (subnet.end > parent.end) throw new Error(`Espacio insuficiente en ${parent.cidr} para asignar «${request.name}». Reduce la demanda o amplía la red base.`);
    cursor = subnet.end + 1n;
    return { ...subnet, name: request.name, required: request.required, spare: subnet.capacity - request.required };
  });
  const allocated = cursor - parent.start;
  return { parent, rows, allocated, remaining: parent.total - allocated,
    requested: rows.reduce((sum, row) => sum + row.required, 0n),
    free: cursor <= parent.end ? rangeToCIDRs(cursor, parent.end, 4) : [] };
}

export function compareNetworks(inputs) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > 128) throw new Error('Introduce entre 1 y 128 redes, una por línea.');
  const networks = inputs.map((input, index) => {
    try { return parseNetwork(input); } catch (error) { throw new Error(`Línea ${index + 1}: ${error.message}`); }
  });
  const overlaps = [];
  for (let i = 0; i < networks.length; i++) {
    for (let j = i + 1; j < networks.length; j++) {
      const a = networks[i], b = networks[j];
      if (a.version !== b.version || a.start > b.end || b.start > a.end) continue;
      const relationship = a.start === b.start && a.end === b.end ? 'Son la misma red' : a.start <= b.start && a.end >= b.end ? 'La primera contiene a la segunda' : 'La segunda contiene a la primera';
      overlaps.push({ first: a.cidr, second: b.cidr, relationship, firstLine: i + 1, secondLine: j + 1 });
    }
  }
  const aggregated = [];
  for (const version of [4, 6]) {
    const sorted = networks.filter(n => n.version === version).sort((a, b) => a.start === b.start ? a.end === b.end ? 0 : a.end < b.end ? -1 : 1 : a.start < b.start ? -1 : 1);
    const ranges = [];
    for (const network of sorted) {
      const previous = ranges.at(-1);
      if (previous && network.start <= previous.end + 1n) previous.end = network.end > previous.end ? network.end : previous.end;
      else ranges.push({ start: network.start, end: network.end });
    }
    for (const range of ranges) aggregated.push(...rangeToCIDRs(range.start, range.end, version));
  }
  return { networks, overlaps, aggregated };
}

export function toCSV(rows) {
  return '\ufeff' + rows.map(row => row.map(value => {
    let text = String(value);
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n') + '\r\n';
}
