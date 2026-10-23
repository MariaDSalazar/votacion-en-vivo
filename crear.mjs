// Crea la votación o actualiza sus textos. Uso: node crear.mjs
// Primera vez: crea un usuario anfitrión anónimo, las salas (cerradas) y acceso.js con su sesión
// cifrada con la clave (CLAVE-DOCENTE.txt). Después: vuelve a subir titulo y preguntas de
// encuesta.json; los puntajes los cambia el anfitrión desde el panel.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const aqui = (f) => new URL(f, import.meta.url);
const KEY = 'AIzaSyBZsP2gppSDrhc0-QlrXAaHcbLg-GDP_7E';
const DB = 'https://duelo-de-datos-default-rtdb.firebaseio.com';
const clave = readFileSync(aqui('CLAVE-DOCENTE.txt'), 'utf8').trim();
const enc = JSON.parse(readFileSync(aqui('encuesta.json'), 'utf8'));

const errores = [];
const lleno = (s) => typeof s === 'string' && s.trim() !== '';
if (!lleno(enc.titulo)) errores.push('falta titulo');
if (!(enc.total > 0)) errores.push('total debe ser un número positivo');
if (!(enc.puntajes?.length >= 2 && enc.puntajes.length <= 4) || enc.puntajes.some(([p, t]) => p + t !== enc.total)) errores.push('puntajes: de 2 a 4 pares que sumen total');
enc.preguntas?.forEach((p, n) => {
  if (!lleno(p.c) || !lleno(p.t)) errores.push(`pregunta ${n + 1}: faltan c o t`);
  if (!p.puntajes && !(p.o?.length >= 2 && p.o.length <= 4 && p.o.every((o) => lleno(o.t)))) errores.push(`pregunta ${n + 1}: de 2 a 4 opciones con t`);
});
if (!enc.preguntas?.length) errores.push('faltan preguntas');
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }

const { subtle } = crypto;
const b64 = (u) => Buffer.from(u).toString('base64');
const u8 = (b) => new Uint8Array(Buffer.from(b, 'base64'));
const llave = async (sal) => subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: 200000, hash: 'SHA-256' },
  await subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey']),
  { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
const pedir = async (url, init) => {
  const res = await fetch(url, init);
  const j = await res.json();
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url.split('?')[0]}: ${JSON.stringify(j.error)}`);
  return j;
};

let SALAS, refresh;
if (existsSync(aqui('acceso.js'))) {
  const { SALAS: s, HOST } = await import('./acceso.js');
  if (s.length !== enc.preguntas.length) throw new Error(`acceso.js tiene ${s.length} salas y encuesta.json ${enc.preguntas.length} preguntas`);
  SALAS = s;
  refresh = new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: u8(HOST.iv) }, await llave(u8(HOST.sal)), u8(HOST.d)));
} else {
  refresh = (await pedir(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' })).refreshToken;
  const id = crypto.randomUUID().slice(0, 8);
  SALAS = enc.preguntas.map((_, i) => `votacion-${id}-${i + 1}`);
  const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const d = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, await llave(sal), new TextEncoder().encode(refresh)));
  writeFileSync(aqui('acceso.js'), '// Generado por crear.mjs. HOST solo se abre con la clave del anfitrión.\n'
    + `export const SALAS = ${JSON.stringify(SALAS)};\nexport const HOST = ${JSON.stringify({ sal: b64(sal), iv: b64(iv), d: b64(d) })};\n`);
}

const tok = await pedir(`https://securetoken.googleapis.com/v1/token?key=${KEY}`,
  { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }) });
const db = (metodo, ruta, cuerpo) => pedir(`${DB}/${ruta}.json?auth=${tok.id_token}`, { method: metodo, body: cuerpo && JSON.stringify(cuerpo) });

for (const [i, s] of SALAS.entries()) {
  if (await db('GET', `salas/${s}/host`) === null) {
    const config = i === 0 ? { config: { titulo: enc.titulo, total: enc.total, puntajes: enc.puntajes, preguntas: enc.preguntas } } : {};
    await db('PUT', `salas/${s}`, { host: tok.user_id, creada: { '.sv': 'timestamp' }, estado: { fase: 'cerrada' }, ...config });
    console.log(`sala ${s} creada`);
  } else if (i === 0) {
    await db('PATCH', `salas/${s}/config`, { titulo: enc.titulo, preguntas: enc.preguntas });
    console.log('textos actualizados');
  }
}
