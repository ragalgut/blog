#!/usr/bin/env python3
"""Contrasta el motor IP con ipaddress de Python mediante casos reproducibles."""
import ipaddress as ip
import json
from pathlib import Path
import random
import subprocess
import sys

rng = random.Random(20261030)
cases, expected = [], []

for version, bits, address_type in [(4, 32, ip.IPv4Address), (6, 128, ip.IPv6Address)]:
    for _ in range(1000):
        address, prefix = address_type(rng.getrandbits(bits)), rng.randrange(bits + 1)
        network = ip.ip_network(f'{address}/{prefix}', strict=False)
        reserved = 2 if version == 4 and prefix < 31 else 0
        cases.append({'kind': 'analyze', 'value': f'{address}/{prefix}'})
        expected.append({'cidr': str(network), 'start': str(int(network.network_address)),
                         'end': str(int(network.broadcast_address)), 'total': str(network.num_addresses),
                         'capacity': str(network.num_addresses - reserved), 'mask': str(network.netmask)})
    for _ in range(128):
        start, end = sorted([rng.getrandbits(bits), rng.getrandbits(bits)])
        cases.append({'kind': 'range', 'version': version, 'start': str(start), 'end': str(end)})
        expected.append([str(n) for n in ip.summarize_address_range(address_type(start), address_type(end))])
    for _ in range(64):
        networks = [ip.ip_network(f'{address_type(rng.getrandbits(bits))}/{rng.randrange(bits + 1)}', strict=False)
                    for _ in range(rng.randrange(1, 33))]
        # Add siblings, duplicates and contained blocks, not only disjoint random ranges.
        parent = ip.ip_network(f'{address_type(rng.getrandbits(bits))}/{rng.randrange(bits)}', strict=False)
        networks.extend(parent.subnets(prefixlen_diff=1))
        networks.extend([parent, parent])
        cases.append({'kind': 'aggregate', 'values': [str(n) for n in networks]})
        expected.append([str(n) for n in ip.collapse_addresses(networks)])

for profile, minimum, reserved in [('standard', 4, 2), ('azure', 8, 5), ('aws', 16, 5)]:
    for _ in range(100):
        parent = ip.ip_network(f'{ip.IPv4Address(rng.getrandbits(32))}/{rng.randrange(16, 31)}', strict=False)
        requests = [{'name': f'Red {i}', 'hosts': rng.randrange(1, 600)} for i in range(rng.randrange(1, 12))]
        prepared = sorted(enumerate(requests), key=lambda item: (-max(minimum, 1 << (item[1]['hosts'] + reserved - 1).bit_length()), item[0]))
        cursor, rows, failed = int(parent.network_address), [], False
        for _, request in prepared:
            size = max(minimum, 1 << (request['hosts'] + reserved - 1).bit_length())
            start = (cursor + size - 1) // size * size
            if start + size - 1 > int(parent.broadcast_address):
                failed = True
                break
            rows.append({'name': request['name'], 'cidr': str(ip.ip_network((start, 32 - (size.bit_length()-1)))),
                         'capacity': str(size - reserved)})
            cursor = start + size
        cases.append({'kind': 'vlsm', 'value': str(parent), 'requests': requests, 'profile': profile})
        expected.append({'error': True} if failed else {'rows': rows, 'remaining': str(int(parent.broadcast_address) - cursor + 1)})

module_url = (Path(__file__).resolve().parents[1] / 'assets/js/ip-core.mjs').as_uri()
runner = '''
import fs from 'node:fs';
const core = await import(process.argv[1]);
const result = JSON.parse(fs.readFileSync(0,'utf8')).map(c => {
  if(c.kind==='analyze') {
    const n=core.analyzeNetwork(c.value);
    return {cidr:n.cidr,start:n.start,end:n.end,total:n.total,capacity:n.capacity,mask:core.formatAddress(n.mask,n.version)};
  }
  if(c.kind==='range') return core.rangeToCIDRs(BigInt(c.start),BigInt(c.end),c.version).map(n=>n.cidr);
  if(c.kind==='aggregate') return core.compareNetworks(c.values).aggregated.map(n=>n.cidr);
  try {
    const n=core.allocateVLSM(c.value,c.requests,c.profile);
    return {rows:n.rows.map(r=>({name:r.name,cidr:r.cidr,capacity:r.capacity})),remaining:n.remaining};
  } catch(error) { return {error:true}; }
});
process.stdout.write(JSON.stringify(result,(_,v)=>typeof v==='bigint'?String(v):v));
'''
node = sys.argv[1] if len(sys.argv) > 1 else 'node'
result = subprocess.run([node, '--input-type=module', '-e', runner, module_url],
                        input=json.dumps(cases), text=True, capture_output=True, check=True)
actual = json.loads(result.stdout)
assert len(actual) == len(expected)
for index, (got, want) in enumerate(zip(actual, expected)):
    assert got == want, f'Caso {index}: {cases[index]}\nObtenido: {got}\nEsperado: {want}'
print(f'Referencia independiente correcta: {len(cases)} casos IPv4, IPv6, rangos, agregación y VLSM.')
