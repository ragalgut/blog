import { parseNetwork, analyzeNetwork, formatAddress, classifyAddress, listSubnets, allocateVLSM, compareNetworks, toCSV } from './ip-core.mjs';

const tool = document.querySelector('[data-ip-tool]');
const $ = id => tool.querySelector('#' + id);
const count = value => new Intl.NumberFormat('es-ES').format(value);
const address = (value, network) => formatAddress(value, network.version);
let calculation = null, split = null, splitPage = 0n, vlsm = null, comparison = null, requestId = 0;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = String(text);
  if (className) element.className = className;
  return element;
}
function announce(text) { $('ip-status').textContent = text; }
function error(id, exception) { $(id).textContent = exception.message; $(id).hidden = false; }
function clearError(id) { $(id).textContent = ''; $(id).hidden = true; }
function invalidate(kind) {
  $(kind + '-result').hidden = true;
  $(kind + '-pending').hidden = false;
  clearError(kind + '-error');
  announce('');
}
function rows(id, data, names = false) {
  $(id).replaceChildren(...data.map(values => {
    const row = node('tr');
    row.append(...values.map((value, index) => node('td', typeof value === 'bigint' ? count(value) : value, names && index === 0 ? 'ip-name-cell' : undefined)));
    return row;
  }));
}
function facts(id, data, stats = false) {
  $(id).replaceChildren(...data.map(([label, value]) => {
    const item = node('div');
    const formatted = typeof value === 'bigint' ? count(value) : String(value);
    item.append(node('dt', label), node('dd', formatted, stats && formatted.length > 14 ? 'ip-big-number' : undefined));
    return item;
  }));
}
function cidrs(id, networks) { $(id).replaceChildren(...networks.map(network => node('li', network.cidr))); }
async function copy(text, message) {
  try { await navigator.clipboard.writeText(text); announce(message); }
  catch (_) { announce('No se ha podido acceder al portapapeles. Puedes seleccionar y copiar los resultados manualmente.'); }
}
function downloadCSV(filename, data) {
  const url = URL.createObjectURL(new Blob([toCSV(data)], { type: 'text/csv;charset=utf-8' }));
  const link = node('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  announce('CSV preparado. Solo incluye el resultado indicado.');
}

const tabs = [...tool.querySelectorAll('[data-ip-tab]')];
function selectTab(tab, focus = false) {
  for (const item of tabs) {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1;
    $('ip-panel-' + item.dataset.ipTab).hidden = !active;
  }
  announce('');
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs.at(-1);
    if (next) { event.preventDefault(); selectTab(next, true); }
  });
});

function renderBinary(network) {
  const groupSize = network.version === 4 ? 8 : 16;
  $('ip-binary').replaceChildren(...[['IP', network.address], ['Máscara', network.mask], ['Red', network.start]].map(([label, value]) => {
    const row = node('div', undefined, 'ip-binary-row'); row.append(node('span', label));
    const groups = node('div', undefined, 'ip-binary-groups');
    const bits = value.toString(2).padStart(network.bits, '0');
    for (let i = 0; i < network.bits; i += groupSize) {
      const group = node('span');
      const networkLength = Math.max(0, Math.min(groupSize, network.prefix - i));
      group.append(node('span', bits.slice(i, i + networkLength), 'ip-binary-network'), node('span', bits.slice(i + networkLength, i + groupSize)));
      groups.append(group);
    }
    row.append(groups); return row;
  }));
}

function calculate() {
  calculation = null; split = null;
  clearError('ip-calc-error'); clearError('ip-split-error');
  $('ip-calc-result').hidden = true; $('ip-split-result').hidden = true; $('ip-calc-pending').hidden = true;
  try {
    const n = analyzeNetwork(parseNetwork($('ip-address').value, $('ip-mask').value), $('ip-profile').value);
    calculation = n;
    $('ip-address').value = address(n.address, n); $('ip-mask').value = '/' + n.prefix;
    $('ip-result-family').textContent = `RED IPv${n.version} · ${$('ip-profile').selectedOptions[0].textContent}`;
    $('ip-network-title').textContent = n.cidr;
    const secondary = n.version === 4 ? ['Hosts disponibles', n.capacity] : n.prefix <= 64 ? ['Subredes /64 en el bloque', 1n << BigInt(64 - n.prefix)] : ['Longitud de la dirección', '128 bits'];
    facts('ip-stats', [['Direcciones totales', n.total], secondary, ['Bits de red', n.prefix], ['Bits de host', n.bits - n.prefix]], true);
    $('ip-address-note').textContent = n.version === 4
      ? `La IP ${address(n.address, n)} pertenece a ${n.cidr}. ${n.address >= n.first && n.address <= n.last ? 'Está dentro del rango de hosts de este perfil.' : 'Está reservada según este perfil y queda fuera del rango de hosts.'}`
      : `La IP ${address(n.address, n)} pertenece a ${n.cidr}. Los límites mostrados corresponden al bloque completo, no a un rango de hosts asignables.`;
    const details = [['IP introducida', address(n.address, n)], ['Tipo de IP introducida', classifyAddress({ version: n.version, value: n.address })], ['Máscara de red', address(n.mask, n)]];
    if (n.version === 4) details.push(['Wildcard', address(n.wildcard, n)]);
    details.push([n.version === 4 ? 'Primer host disponible' : 'Primera dirección del bloque', address(n.first, n)], [n.version === 4 ? 'Último host disponible' : 'Última dirección del bloque', address(n.last, n)]);
    if (n.version === 4) {
      if (n.profile !== 'standard') details.push(['Primeras cuatro reservadas', `${address(n.start,n)} – ${address(n.start+3n,n)}`], ['Última dirección reservada', address(n.end,n)]);
      else details.push(['Broadcast dirigido', n.broadcast === null ? 'No se aplica a este prefijo' : address(n.broadcast, n)]);
      details.push(['Direcciones excluidas por el perfil', count(n.reserved)]);
    }
    else details.push(['IP expandida', Array.from({length:8},(_,i)=>((n.address >> BigInt((7-i)*16)) & 65535n).toString(16).padStart(4,'0')).join(':')]);
    facts('ip-facts', details); $('ip-policy-note').textContent = n.note; renderBinary(n);
    const maximum = n.profile === 'azure' ? 29 : n.profile === 'aws' ? 28 : n.bits;
    $('ip-split-prefix').min = String(n.prefix); $('ip-split-prefix').max = String(maximum);
    $('ip-split-prefix').value = String(Math.min(maximum, n.prefix + (n.version === 4 ? 2 : 4)));
    splitPage = 0n; $('ip-calc-result').hidden = false;
    announce(`Red IPv${n.version} calculada: ${n.cidr}.`);
  } catch (exception) { error('ip-calc-error', exception); }
}
$('ip-calc-form').addEventListener('submit', event => { event.preventDefault(); calculate(); });
$('ip-calc-form').addEventListener('input', () => { calculation = null; split = null; invalidate('ip-calc'); });
const examples = { private: ['192.168.1.42','/24','standard'], ipv6: ['2001:db8:abcd:1::42','/64','standard'], point: ['192.0.2.10','/31','standard'], azure: ['10.20.1.6','/27','azure'] };
tool.querySelectorAll('[data-ip-example]').forEach(button => button.addEventListener('click', () => {
  const [ip, mask, profile] = examples[button.dataset.ipExample];
  $('ip-address').value = ip; $('ip-mask').value = mask; $('ip-profile').value = profile; calculate();
}));
$('ip-copy-result').addEventListener('click', () => {
  if (!calculation) return;
  const n = calculation;
  copy([`Red: ${n.cidr}`, `IP: ${address(n.address,n)}`, `Máscara: ${address(n.mask,n)}`, `Direcciones totales: ${n.total}`, ...(n.version === 4 ? [`Hosts disponibles: ${n.capacity}`] : []), `Rango: ${address(n.first,n)} - ${address(n.last,n)}`, n.note].join('\n'), 'Resumen de la red copiado.');
});

function renderSplit() {
  if (!calculation) return;
  split = null; $('ip-split-result').hidden = true; clearError('ip-split-error');
  try {
    split = listSubnets(calculation, $('ip-split-prefix').value, {page:splitPage,profile:calculation.profile});
    const ipv4 = calculation.version === 4;
    $('ip-split-first-label').textContent = ipv4 ? 'Primer host' : 'Primera dirección';
    $('ip-split-last-label').textContent = ipv4 ? 'Último host' : 'Última dirección';
    $('ip-split-capacity-label').textContent = ipv4 ? 'Hosts disponibles' : 'Direcciones del bloque';
    rows('ip-split-rows', split.rows.map((n,i)=>[split.offset+BigInt(i)+1n,n.cidr,address(n.first,n),address(n.last,n),n.capacity]));
    $('ip-split-count').textContent = `${count(split.total)} subred${split.total===1n?'':'es'} /${split.rows[0].prefix}. Se muestran de la ${count(split.offset+1n)} a la ${count(split.offset+BigInt(split.rows.length))}.`;
    $('ip-split-page').textContent = `Página ${count(split.page+1n)} de ${count(split.pages)}`;
    $('ip-split-prev').disabled = split.page === 0n; $('ip-split-next').disabled = split.page + 1n >= split.pages;
    $('ip-split-result').hidden = false;
    announce(`División calculada. ${count(split.total)} ${split.total===1n?'subred':'subredes'}; ${split.rows.length} en esta página.`);
  } catch (exception) { error('ip-split-error',exception); }
}
$('ip-split-form').addEventListener('submit',event=>{event.preventDefault();splitPage=0n;renderSplit();});
$('ip-split-prefix').addEventListener('input',()=>{split=null;$('ip-split-result').hidden=true;clearError('ip-split-error');});
$('ip-split-prev').addEventListener('click',()=>{if(split&&splitPage>0n){splitPage--;renderSplit();}});
$('ip-split-next').addEventListener('click',()=>{if(split&&splitPage+1n<split.pages){splitPage++;renderSplit();}});
$('ip-copy-subnets').addEventListener('click',()=>{if(split)copy(split.rows.map(n=>n.cidr).join('\n'),'Subredes de esta página copiadas.');});
$('ip-export-subnets').addEventListener('click',()=>{if(split)downloadCSV('subredes-pagina-'+(split.page+1n)+'.csv',[[ 'Red CIDR','Primera dirección del rango','Última dirección del rango',calculation.version===4?'Hosts disponibles':'Direcciones del bloque'],...split.rows.map(n=>[n.cidr,address(n.first,n),address(n.last,n),n.capacity])]);});

function updateRequestButtons() {
  const size = $('ip-vlsm-requests').children.length;
  $('ip-vlsm-add').disabled = size >= 32;
  tool.querySelectorAll('.ip-request-remove').forEach(button=>button.disabled=size<=1);
}
function addRequest(name, hosts, focus = false) {
  if ($('ip-vlsm-requests').children.length >= 32) return;
  const id = ++requestId, row = node('div',undefined,'ip-request');
  for (const [kind,label,value,type] of [['name',`Nombre · ${id}`,name,'text'],['hosts','Hosts',hosts,'number']]) {
    const field=node('div',undefined,'ip-field'), input=node('input'), caption=node('label',label);
    input.id=`ip-request-${id}-${kind}`; caption.htmlFor=input.id; input.type=type; input.value=String(value); input.dataset.requestField=kind; input.autocomplete='off';
    if(kind==='name')input.maxLength=80;else{input.min='1';input.max='4294967294';input.step='1';input.inputMode='numeric';}
    field.append(caption,input);row.append(field);
  }
  const remove=node('button','×','button ip-request-remove');remove.type='button';remove.setAttribute('aria-label',`Eliminar subred ${id}`);
  remove.addEventListener('click',()=>{
    if($('ip-vlsm-requests').children.length<=1)return;
    const next=row.nextElementSibling||row.previousElementSibling;row.remove();updateRequestButtons();vlsm=null;invalidate('ip-vlsm');next?.querySelector('input').focus();
  });
  row.append(remove);$('ip-vlsm-requests').append(row);updateRequestButtons();
  if(focus){vlsm=null;invalidate('ip-vlsm');row.querySelector('input').focus();}
}
$('ip-vlsm-add').addEventListener('click',()=>addRequest('Subred '+(requestId+1),10,true));
$('ip-vlsm-form').addEventListener('input',()=>{vlsm=null;invalidate('ip-vlsm');});
function renderVlsmMap(plan) {
  const namespace='http://www.w3.org/2000/svg', svg=document.createElementNS(namespace,'svg');
  svg.setAttribute('viewBox','0 0 1000 40');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${count(plan.allocated)} direcciones asignadas a subredes; ${count(plan.remaining)} libres en ${plan.parent.cidr}.`);
  const segments=plan.rows.map((n,i)=>({name:n.name,size:n.total,index:String(i%4),cidr:n.cidr}));
  if(plan.remaining)segments.push({name:'Espacio libre',size:plan.remaining,index:'free',cidr:''});
  let offset=0;const legend=[];
  for(const segment of segments){
    const rect=document.createElementNS(namespace,'rect'), width=Number(segment.size)/Number(plan.parent.total)*1000;
    rect.setAttribute('x',String(offset));rect.setAttribute('y','0');rect.setAttribute('width',String(width));rect.setAttribute('height','40');rect.setAttribute('class','ip-map-segment ip-map-segment--'+segment.index);
    const title=document.createElementNS(namespace,'title');title.textContent=`${segment.name}: ${segment.cidr||count(segment.size)+' direcciones'}`;rect.append(title);svg.append(rect);offset+=width;
    const entry=node('li'), dot=node('span',undefined,'ip-map-dot ip-map-dot--'+segment.index);dot.setAttribute('aria-hidden','true');entry.append(dot,node('span',segment.name+' · '+(segment.cidr||count(segment.size))));legend.push(entry);
  }
  $('ip-vlsm-map').replaceChildren(svg);$('ip-vlsm-legend').replaceChildren(...legend);
}
$('ip-vlsm-form').addEventListener('submit',event=>{
  event.preventDefault();vlsm=null;clearError('ip-vlsm-error');$('ip-vlsm-result').hidden=true;$('ip-vlsm-pending').hidden=true;
  try{
    const requests=[...$('ip-vlsm-requests').children].map(row=>({name:row.querySelector('[data-request-field="name"]').value,hosts:row.querySelector('[data-request-field="hosts"]').value}));
    vlsm=allocateVLSM($('ip-vlsm-network').value,requests,$('ip-vlsm-profile').value);
    $('ip-vlsm-result-title').textContent=vlsm.parent.cidr;
    $('ip-vlsm-summary').textContent=`${vlsm.rows.length} ${vlsm.rows.length===1?'subred':'subredes'} · ${count(vlsm.requested)} hosts solicitados · ${count(vlsm.allocated)} de ${count(vlsm.parent.total)} direcciones asignadas a subredes.`;
    renderVlsmMap(vlsm);rows('ip-vlsm-rows',vlsm.rows.map(n=>[n.name,n.cidr,n.required,n.capacity,address(n.first,n),address(n.last,n)]),true);
    $('ip-vlsm-free-note').textContent=vlsm.remaining?`${count(vlsm.remaining)} direcciones libres, representadas sin huecos por estos CIDR:`:'El plan ocupa todo el bloque base. No quedan direcciones libres.';
    cidrs('ip-vlsm-free',vlsm.free);$('ip-vlsm-result').hidden=false;announce(`Plan creado: ${vlsm.rows.length} ${vlsm.rows.length===1?'subred':'subredes'} sin solapamientos.`);
  }catch(exception){error('ip-vlsm-error',exception);}
});
$('ip-copy-vlsm').addEventListener('click',()=>{if(vlsm)copy([`Plan: ${vlsm.parent.cidr}`,...vlsm.rows.map(n=>`${n.name}: ${n.cidr} | ${n.required} hosts solicitados | ${n.capacity} disponibles | ${address(n.first,n)} - ${address(n.last,n)}`),`Libres: ${vlsm.free.map(n=>n.cidr).join(', ')||'sin espacio libre'}`].join('\n'),'Plan VLSM copiado.');});
$('ip-export-vlsm').addEventListener('click',()=>{if(vlsm)downloadCSV('plan-vlsm.csv',[['Nombre','Red CIDR','Hosts solicitados','Hosts disponibles','Primer host de la subred','Último host de la subred'],...vlsm.rows.map(n=>[n.name,n.cidr,n.required,n.capacity,address(n.first,n),address(n.last,n)]),...vlsm.free.map(n=>['Espacio libre',n.cidr,'','','',''])]);});

$('ip-compare-form').addEventListener('input',()=>{comparison=null;invalidate('ip-compare');});
$('ip-compare-form').addEventListener('submit',event=>{
  event.preventDefault();comparison=null;clearError('ip-compare-error');$('ip-compare-result').hidden=true;$('ip-compare-pending').hidden=true;
  const lines=$('ip-networks').value.split(/\r?\n/).map((text,index)=>({text:text.trim(),number:index+1})).filter(line=>line.text);
  try{
    comparison=compareNetworks(lines.map(line=>line.text));
    const {networks,overlaps,aggregated}=comparison;
    $('ip-compare-summary').textContent=`${networks.length} ${networks.length===1?'red':'redes'} de entrada · ${aggregated.length} CIDR tras agrupar. ${overlaps.length ? count(overlaps.length)+(overlaps.length===1?' par de redes se solapa.':' pares de redes se solapan.') : 'No hay solapamientos entre las redes de entrada.'}`;
    cidrs('ip-aggregate-list',aggregated);
    $('ip-normalized-list').replaceChildren(...networks.map(n=>node('li',n.cidr)));
    $('ip-overlaps').hidden=!overlaps.length;
    $('ip-overlap-count').textContent=overlaps.length>100?`Se muestran los primeros 100 de ${count(overlaps.length)} pares. Los números de línea corresponden a la lista normalizada.`:'Los números de línea corresponden a la lista normalizada.';
    rows('ip-overlap-rows',overlaps.slice(0,100).map(pair=>[`${pair.firstLine} / ${pair.secondLine}`,pair.first,pair.second,pair.relationship]));
    $('ip-compare-result').hidden=false;announce(`Comparación completa: ${overlaps.length} ${overlaps.length===1?'par':'pares'} con solapamiento; ${aggregated.length} CIDR agregados.`);
  }catch(exception){
    const message=exception.message.replace(/^Línea (\d+):/,(_,index)=>`Línea ${lines[Number(index)-1].number}:`);
    error('ip-compare-error',{message});
  }
});
$('ip-copy-aggregate').addEventListener('click',()=>{if(comparison)copy(comparison.aggregated.map(n=>n.cidr).join('\n'),'Lista CIDR agregada copiada.');});

addRequest('Producción',60);addRequest('Preproducción',28);addRequest('Gestión',12);
tool.hidden=false;calculate();
