/* ============================================================
   Generadores de números pseudoaleatorios — LÓGICA
   Introducción a la Simulación
   Elías Mieles Gómez · Ramiro Mejía Conde

   Contenido de este archivo:
     1. Utilidades comunes (render de tablas y mensajes)
     2. Generador congruencial lineal
     3. Generador de cuadrados medios (no congruencial)
   ============================================================ */

/* ---------- 1. UTILIDADES COMUNES ---------- */

function renderRows(tbodyEl, filas, marcas){
  tbodyEl.innerHTML = '';
  const origen = marcas && typeof marcas.origen === 'number' ? marcas.origen : -1;
  const repeticion = marcas && typeof marcas.repeticion === 'number' ? marcas.repeticion : -1;
  filas.forEach((f, idx) => {
    const tr = document.createElement('tr');
    if (idx === repeticion) tr.classList.add('cycle-hit');
    else if (idx === origen) tr.classList.add('cycle-origin');
    if (f.esSemilla) tr.classList.add('seed-row');
    const etiqueta = f.esSemilla ? '0 <span class="tag">semilla</span>' : f.i;
    tr.innerHTML = `<td>${etiqueta}</td><td>${f.x}</td><td>${f.r.toFixed(6)}</td>`;
    tbodyEl.appendChild(tr);
  });
}

function setStatus(el, kind, html){
  el.className = 'status show ' + kind;
  el.innerHTML = html;
}


/* ============================================================
   2. GENERADOR CONGRUENCIAL LINEAL
      X(i+1) = (a*X(i) + c) mod m        r(i) = X(i) / (m-1)
   ============================================================ */

const LCG_PRESETS = {
  corto: { m: 256n,        a: 141n,        c: 91n },
  medio: { m: 65536n,      a: 2045n,       c: 8365n },
  largo: { m: 2147483648n, a: 1103515245n, c: 12345n }
};

function bigIntDivToFloat(numerador, denominador, decimales){
  if (denominador <= 0n) return NaN;
  const escala = 10n ** BigInt(decimales);
  const escalado = (numerador * escala) / denominador;
  return Number(escalado) / Number(escala);
}

function esPotenciaDeDos(n){
  return n > 0n && (n & (n - 1n)) === 0n;
}

function evaluarCondicionesLCG(m, a, c){
  if (m <= 1n) return { ok: false, mensaje: 'm debe ser mayor que 1.' };
  const mPot2 = esPotenciaDeDos(m);
  const aMod4 = a % 4n;
  const cImpar = (c % 2n) === 1n;
  if (mPot2 && aMod4 === 1n && cImpar){
    return { ok: true, mensaje: `Cumple las condiciones de periodo máximo (m potencia de 2, a≡1 mod 4, c impar) → periodo teórico = m = ${m}.` };
  }
  return { ok: false, mensaje: `No cumple las tres condiciones de periodo máximo vistas en clase (m potencia de 2: ${mPot2 ? 'sí' : 'no'}, a mod 4 = ${aMod4}, c impar: ${cImpar ? 'sí' : 'no'}). El periodo real puede ser más corto que m; el programa lo detecta igual al generar.` };
}

function leerLCGVars(){
  const m = BigInt(document.getElementById('lcg-m').value.trim() || '0');
  const a = BigInt(document.getElementById('lcg-a').value.trim() || '0');
  const c = BigInt(document.getElementById('lcg-c').value.trim() || '0');
  return { m, a, c };
}

function actualizarValidacionLCG(){
  try{
    const { m, a, c } = leerLCGVars();
    const res = evaluarCondicionesLCG(m, a, c);
    const el = document.getElementById('lcg-validation');
    el.textContent = res.mensaje;
    el.style.color = res.ok ? 'var(--ok)' : 'var(--text-muted)';
  } catch(e){
    document.getElementById('lcg-validation').textContent = 'Escribe valores enteros válidos para m, a y c.';
  }
}

['lcg-m', 'lcg-a', 'lcg-c'].forEach(id =>
  document.getElementById(id).addEventListener('input', actualizarValidacionLCG));

document.getElementById('lcg-preset').addEventListener('change', (e) => {
  const p = LCG_PRESETS[e.target.value];
  document.getElementById('lcg-m').value = p.m.toString();
  document.getElementById('lcg-a').value = p.a.toString();
  document.getElementById('lcg-c').value = p.c.toString();
  actualizarValidacionLCG();
});

actualizarValidacionLCG();

function generarLCG(seed, a, c, m, count){
  const vistos = new Map();
  let x = ((BigInt(seed) % m) + m) % m;
  vistos.set(x.toString(), 0);
  const filas = [{ i: 0, x: x.toString(), r: bigIntDivToFloat(x, m - 1n, 6), esSemilla: true }];
  let cicloInfo = null;
  for (let i = 1; i <= count; i++){
    x = (a * x + c) % m;
    const key = x.toString();
    if (vistos.has(key)){
      cicloInfo = { desde: vistos.get(key), en: i, longitud: i - vistos.get(key), valor: x.toString() };
      filas.push({ i, x: x.toString(), r: bigIntDivToFloat(x, m - 1n, 6) });
      break;
    }
    vistos.set(key, i);
    filas.push({ i, x: x.toString(), r: bigIntDivToFloat(x, m - 1n, 6) });
  }
  return { filas, cicloInfo };
}

document.getElementById('lcg-generate').addEventListener('click', () => {
  let m, a, c;
  try {
    ({ m, a, c } = leerLCGVars());
    if (m <= 1n || a < 0n || c < 0n) throw new Error('rango inválido');
  } catch(e){
    setStatus(document.getElementById('lcg-status'), 'warn', 'Revisa m, a y c: deben ser enteros válidos (m &gt; 1).');
    return;
  }

  const count = Math.max(1, Math.min(5000, parseInt(document.getElementById('lcg-count').value || '1', 10)));
  const seed = parseInt(document.getElementById('lcg-seed').value || '0', 10);

  const { filas, cicloInfo } = generarLCG(seed, a, c, m, count);

  const statusEl = document.getElementById('lcg-status');
  if (cicloInfo){
    const distintos = cicloInfo.en - 1;
    const origenTxt = cicloInfo.desde === 0
      ? `la semilla inicial (posición 0)`
      : `la posición ${cicloInfo.desde}`;
    setStatus(statusEl, 'warn',
      `Se repitió el valor <strong>X = ${cicloInfo.valor}</strong>.<br>` +
      `Apareció por primera vez en ${origenTxt} y volvió a salir en la <strong>posición ${cicloInfo.en}</strong>. ` +
      `A partir de ahí la secuencia se repite en ciclo de longitud <strong>${cicloInfo.longitud}</strong>, ` +
      `así que solo existen <strong>${distintos}</strong> aleatorios distintos con estos parámetros. Generación detenida.`);
  } else {
    setStatus(statusEl, 'ok',
      `Se generaron los ${filas.length - 1} números pedidos sin ninguna repetición (periodo real ≥ ${filas.length - 1}).`);
  }

  document.getElementById('lcg-params').textContent =
    `Semilla usada: X0 = ${seed}  ·  m = ${m}  ·  a = ${a}  ·  c = ${c}`;

  document.getElementById('lcg-count-label').textContent = `${filas.length - 1} generado(s) + semilla`;
  document.getElementById('lcg-results').style.display = '';
  renderRows(document.getElementById('lcg-tbody'), filas, cicloInfo
    ? { origen: cicloInfo.desde, repeticion: filas.length - 1 }
    : null);
});

document.getElementById('lcg-copy').addEventListener('click', () => {
  const rows = [...document.querySelectorAll('#lcg-tbody tr')].map(tr =>
    [...tr.children].map(td => td.textContent).join('\t'));
  navigator.clipboard.writeText(['i\tX(i)\tr(i)', ...rows].join('\n'));
});


/* ============================================================
   3. GENERADOR DE CUADRADOS MEDIOS (NO CONGRUENCIAL)
      X(i+1) = digitos centrales de X(i)^2
   ============================================================ */

function generarCuadradosMedios(seed, digits, count){
  const vistos = new Map();
  let x = String(seed).padStart(digits, '0');
  vistos.set(x, 0);
  const filas = [{ i: 0, x: x, r: Number(x) / Math.pow(10, digits), esSemilla: true }];
  let cicloInfo = null;
  let degenerado = false;

  for (let i = 1; i <= count; i++){
    const y = Number(x) * Number(x);
    const yStr = y.toString().padStart(digits, '0');
    const start = Math.floor((yStr.length - digits) / 2);
    const midStr = yStr.substr(start, digits);
    const xNext = midStr.padStart(digits, '0');
    const r = Number(xNext) / Math.pow(10, digits);

    if (Number(xNext) === 0){
      filas.push({ i, x: xNext, r });
      degenerado = true;
      break;
    }
    if (vistos.has(xNext)){
      cicloInfo = { desde: vistos.get(xNext), en: i, longitud: i - vistos.get(xNext), valor: xNext };
      filas.push({ i, x: xNext, r });
      break;
    }
    vistos.set(xNext, i);
    filas.push({ i, x: xNext, r });
    x = xNext;
  }
  return { filas, cicloInfo, degenerado };
}

document.getElementById('ms-generate').addEventListener('click', () => {
  const digits = parseInt(document.getElementById('ms-digits').value, 10);
  const count = Math.max(1, Math.min(5000, parseInt(document.getElementById('ms-count').value || '1', 10)));
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;

  let seed = parseInt(document.getElementById('ms-seed').value || String(min), 10);
  if (seed < min || seed > max) seed = min;

  const { filas, cicloInfo, degenerado } = generarCuadradosMedios(seed, digits, count);

  const statusEl = document.getElementById('ms-status');
  if (degenerado){
    setStatus(statusEl, 'warn',
      `Se generaron <strong>${filas.length - 2}</strong> números antes de que el generador degenerara en 0 ` +
      `(a partir de ahí, todos los siguientes valores serían 0). Generación detenida.`);
  } else if (cicloInfo){
    const distintos = cicloInfo.en - 1;
    const origenTxt = cicloInfo.desde === 0
      ? `la semilla inicial (posición 0)`
      : `la posición ${cicloInfo.desde}`;
    setStatus(statusEl, 'warn',
      `Se repitió el valor <strong>X = ${cicloInfo.valor}</strong>.<br>` +
      `Apareció por primera vez en ${origenTxt} y volvió a salir en la <strong>posición ${cicloInfo.en}</strong>. ` +
      `A partir de ahí la secuencia se repite en ciclo de longitud <strong>${cicloInfo.longitud}</strong>, ` +
      `así que solo existen <strong>${distintos}</strong> aleatorios distintos con esta semilla. Generación detenida.`);
  } else {
    setStatus(statusEl, 'ok',
      `Se generaron los ${filas.length - 1} números pedidos sin ninguna repetición.`);
  }

  document.getElementById('ms-params').textContent =
    `Semilla usada: X0 = ${seed}  ·  D = ${digits} dígitos`;

  document.getElementById('ms-count-label').textContent = `${filas.length - 1} generado(s) + semilla`;
  document.getElementById('ms-results').style.display = '';
  renderRows(document.getElementById('ms-tbody'), filas,
    cicloInfo ? { origen: cicloInfo.desde, repeticion: filas.length - 1 }
    : degenerado ? { repeticion: filas.length - 1 }
    : null);
});

document.getElementById('ms-copy').addEventListener('click', () => {
  const rows = [...document.querySelectorAll('#ms-tbody tr')].map(tr =>
    [...tr.children].map(td => td.textContent).join('\t'));
  navigator.clipboard.writeText(['i\tX(i)\tr(i)', ...rows].join('\n'));
});
