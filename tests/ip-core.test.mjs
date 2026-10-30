import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAddress, formatAddress, parsePrefix, parseNetwork, analyzeNetwork, classifyAddress, listSubnets, allocateVLSM, compareNetworks, rangeToCIDRs, toCSV } from '../assets/js/ip-core.mjs';

test('IPv4: red, máscara, wildcard, broadcast y hosts de una /24', () => {
  const n = analyzeNetwork('192.168.1.42/24');
  assert.equal(n.cidr, '192.168.1.0/24');
  assert.equal(formatAddress(n.mask, 4), '255.255.255.0');
  assert.equal(formatAddress(n.wildcard, 4), '0.0.0.255');
  assert.equal(formatAddress(n.broadcast, 4), '192.168.1.255');
  assert.equal(formatAddress(n.first, 4), '192.168.1.1');
  assert.equal(formatAddress(n.last, 4), '192.168.1.254');
  assert.equal(n.capacity, 254n);
});

test('Prefijos /0, /31 punto a punto y /32 no sufren desbordamientos de 32 bits', () => {
  const all = analyzeNetwork('255.255.255.255/0');
  assert.equal(all.start, 0n); assert.equal(all.total, 4294967296n); assert.equal(all.capacity, 4294967294n);
  const link = analyzeNetwork('192.0.2.11/31');
  assert.equal(link.cidr, '192.0.2.10/31'); assert.equal(link.capacity, 2n); assert.equal(link.broadcast, null);
  const host = analyzeNetwork('255.255.255.255/32');
  assert.equal(host.first, host.last); assert.equal(host.capacity, 1n); assert.equal(host.broadcast, null);
});

test('La máscara decimal debe ser continua y el CIDR incluido prevalece sobre la máscara separada', () => {
  assert.equal(parseNetwork('10.0.0.7', '255.255.255.128').prefix, 25);
  assert.equal(parseNetwork('10.0.0.7/28', '/24').prefix, 28);
  assert.equal(parsePrefix('0.0.0.0', 4), 0);
  assert.equal(parsePrefix('255.255.255.255', 4), 32);
  for (const value of ['255.0.255.0','255.255.255.1','255.255.127.0']) assert.throws(() => parsePrefix(value,4));
});

test('Rechaza IP y prefijos ambiguos o inválidos', () => {
  for (const value of ['256.1.1.1','01.2.3.4','1.2.3','1.2.3.4.5','-1.2.3.4','1e2.2.3.4',':::', '1::2::3','2001:db8:0:0:0:0:0:0:1','2001:db8::g','fe80::1%eth0','[::1]','1:2:3:4:5:6:7:']) {
    assert.throws(() => parseAddress(value), value);
  }
  for (const value of ['10.0.0.1/33','10.0.0.1/-1','::/129','10.0.0.1/24/25','10.0.0.1/','10.0.0.1/24.5']) assert.throws(() => parseNetwork(value), value);
});

test('IPv6: compresión con el primer grupo más largo y sin comprimir un único cero', () => {
  const normalize = value => formatAddress(parseAddress(value).value,6);
  assert.equal(normalize('2001:0DB8:0000:0000:0001:0000:0000:0001'), '2001:db8::1:0:0:1');
  assert.equal(normalize('1:2:3:4:5:6:0:8'), '1:2:3:4:5:6:0:8');
  assert.equal(normalize('0:0:0:0:0:0:0:0'), '::');
  assert.equal(normalize('0:0:0:0:0:0:0:1'), '::1');
  assert.equal(normalize('1:0:0:0:0:0:0:0'), '1::');
  assert.equal(normalize('::ffff:192.0.2.1'), '::ffff:c000:201');
});

test('IPv6: /64, /128 y /0 conservan los enteros completos', () => {
  const n = analyzeNetwork('2001:db8:abcd:1::42/64');
  assert.equal(n.cidr,'2001:db8:abcd:1::/64');
  assert.equal(n.total,18446744073709551616n); assert.equal(n.broadcast,null);
  assert.equal(formatAddress(n.end,6),'2001:db8:abcd:1:ffff:ffff:ffff:ffff');
  assert.equal(analyzeNetwork('::1/128').total,1n);
  assert.equal(analyzeNetwork('::/0').total,340282366920938463463374607431768211456n);
});

test('Azure y AWS descuentan cinco direcciones y hacen cumplir sus límites IPv4', () => {
  for (const profile of ['azure','aws']) {
    const n = analyzeNetwork('10.0.0.1/24', profile);
    assert.equal(n.capacity,251n); assert.equal(formatAddress(n.first,4),'10.0.0.4'); assert.equal(formatAddress(n.last,4),'10.0.0.254');
    assert.equal(n.broadcast,null);
    assert.throws(() => analyzeNetwork('2001:db8::/64',profile));
  }
  assert.equal(analyzeNetwork('10.0.0.0/29','azure').capacity,3n);
  assert.equal(analyzeNetwork('10.0.0.0/28','aws').capacity,11n);
  assert.throws(() => analyzeNetwork('10.0.0.0/30','azure'));
  assert.throws(() => analyzeNetwork('10.0.0.0/29','aws'));
  assert.throws(() => analyzeNetwork('10.0.0.0/15','aws'));
});

test('La clasificación no confunde rangos privados, documentación y CGNAT con acceso público', () => {
  assert.match(classifyAddress('172.31.255.255'),/Privada/);
  assert.doesNotMatch(classifyAddress('172.32.0.0'),/Privada/);
  assert.match(classifyAddress('100.127.255.255'),/CGNAT/);
  assert.equal(classifyAddress('198.51.100.3'),'Documentación');
  assert.equal(classifyAddress('2001:db8::1'),'Documentación');
  assert.equal(classifyAddress('fe80::1'),'Enlace local');
  assert.equal(classifyAddress('8.8.8.8'),'Sin clasificación especial en esta herramienta');
});

test('División uniforme exacta y paginación sin enumerar miles de millones de redes', () => {
  const split = listSubnets('192.168.1.42/24',26);
  assert.deepEqual(split.rows.map(row=>row.cidr), ['192.168.1.0/26','192.168.1.64/26','192.168.1.128/26','192.168.1.192/26']);
  const huge = listSubnets('0.0.0.0/0',32,{page:268435455n});
  assert.equal(huge.total,4294967296n); assert.equal(huge.rows.length,16);
  assert.equal(huge.rows.at(-1).cidr,'255.255.255.255/32');
  assert.throws(()=>listSubnets('192.168.1.0/24',23));
  assert.throws(()=>listSubnets('192.168.1.0/24',26,{page:1n}));
});

test('División IPv6 hasta /128 con última página precisa', () => {
  const page = (1n<<124n)-1n;
  const result = listSubnets('::/0',128,{page});
  assert.equal(result.rows.length,16);
  assert.equal(result.rows.at(-1).cidr,'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/128');
});

test('VLSM asigna primero la mayor demanda, sin solapamientos y conserva el espacio libre', () => {
  const result = allocateVLSM('10.0.0.1/24',[{name:'Pequeña',hosts:12},{name:'Grande',hosts:60},{name:'Mediana',hosts:28}]);
  assert.deepEqual(result.rows.map(n=>n.cidr),['10.0.0.0/26','10.0.0.64/27','10.0.0.96/28']);
  assert.deepEqual(result.rows.map(n=>n.name),['Grande','Mediana','Pequeña']);
  assert.equal(result.allocated,112n); assert.equal(result.remaining,144n);
  assert.deepEqual(result.free.map(n=>n.cidr),['10.0.0.112/28','10.0.0.128/25']);
  assert.equal(compareNetworks(result.rows.map(n=>n.cidr)).overlaps.length,0);
  assert.equal(result.rows.reduce((sum,n)=>sum+n.total,0n)+result.free.reduce((sum,n)=>sum+n.total,0n),256n);
});

test('VLSM: reservas cloud, mínimo LAN y error si no cabe la demanda', () => {
  assert.equal(allocateVLSM('10.0.0.0/24',[{name:'LAN',hosts:1}]).rows[0].prefix,30);
  assert.equal(allocateVLSM('10.0.0.0/24',[{name:'LAN',hosts:3}],'azure').rows[0].prefix,29);
  assert.equal(allocateVLSM('10.0.0.0/24',[{name:'LAN',hosts:3}],'aws').rows[0].prefix,28);
  assert.throws(()=>allocateVLSM('10.0.0.0/26',[{name:'No cabe',hosts:63}]));
  assert.throws(()=>allocateVLSM('::/64',[{name:'IPv6',hosts:2}]));
  assert.throws(()=>allocateVLSM('10.0.0.0/24',[{name:'Cero',hosts:0}]));
  assert.throws(()=>allocateVLSM('10.0.0.0/24',[{name:'Fracción',hosts:2.5}]));
});

test('VLSM puede ocupar una /0 completa sin errores de signo o capacidad', () => {
  const result = allocateVLSM('0.0.0.0/0',[{name:'Todo',hosts:4294967294n}]);
  assert.equal(result.rows[0].cidr,'0.0.0.0/0'); assert.equal(result.remaining,0n); assert.deepEqual(result.free,[]);
});

test('VLSM rechaza desbordamientos al final de IPv4 antes de normalizar la dirección', () => {
  for (const [base, requests, profile] of [
    ['255.255.255.252/30', [{name:'A',hosts:2},{name:'B',hosts:2}], 'standard'],
    ['255.255.255.0/24', [{name:'Grande',hosts:300}], 'standard'],
    ['0.0.0.0/0', [{name:'Todo',hosts:4294967294n},{name:'Extra',hosts:2}], 'standard'],
    ['255.255.255.248/29', [{name:'A',hosts:3},{name:'B',hosts:1}], 'azure'],
    ['255.255.255.240/28', [{name:'A',hosts:11},{name:'B',hosts:1}], 'aws']
  ]) assert.throws(() => allocateVLSM(base, requests, profile), /Espacio insuficiente/, base);
  const full = allocateVLSM('255.255.255.252/30', [{name:'Cabe',hosts:2}]);
  assert.equal(full.rows[0].cidr, '255.255.255.252/30');
  assert.equal(full.allocated, 4n);
  assert.equal(full.remaining, 0n);
});

test('Comparación detecta duplicados, pertenencia y mezcla de familias sin falsos positivos', () => {
  const result = compareNetworks(['10.0.0.1/24','10.0.0.128/25','10.0.0.0/24','2001:db8::/64']);
  assert.equal(result.overlaps.length,3);
  assert.equal(result.overlaps[0].relationship,'La primera contiene a la segunda');
  assert.equal(result.overlaps[1].relationship,'Son la misma red');
  assert.equal(result.overlaps[2].relationship,'La segunda contiene a la primera');
  assert.equal(compareNetworks(['10.0.0.1','10.0.0.0/24']).overlaps.length,1);
});

test('La agregación es exacta: no incorpora huecos y elimina duplicados y redes contenidas', () => {
  assert.deepEqual(compareNetworks(['10.0.0.0/25','10.0.0.128/25','10.0.0.0/26']).aggregated.map(n=>n.cidr),['10.0.0.0/24']);
  assert.deepEqual(compareNetworks(['10.0.0.0/24','10.0.2.0/24']).aggregated.map(n=>n.cidr),['10.0.0.0/24','10.0.2.0/24']);
  assert.deepEqual(compareNetworks(['2001:db8::/65','2001:db8:0:0:8000::/65']).aggregated.map(n=>n.cidr),['2001:db8::/64']);
  assert.deepEqual(rangeToCIDRs(1n,6n,4).map(n=>n.cidr),['0.0.0.1/32','0.0.0.2/31','0.0.0.4/31','0.0.0.6/32']);
});

test('Los CSV conservan comillas y comas y neutralizan fórmulas de hojas de cálculo', () => {
  const csv = toCSV([['nombre','red'],['=1+1','10.0.0.0/24'],['  @SUM(A1)','a,b"c'],['-cmd','seguro']]);
  assert.ok(csv.startsWith('\ufeff'));
  assert.match(csv,/"'=1\+1"/); assert.match(csv,/"'  @SUM\(A1\)"/);
  assert.match(csv,/"a,b""c"/); assert.match(csv,/"'-cmd"/);
});
