import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import { SALAS } from './acceso.js';
export { get, update, onValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
export { SALAS };

export const CONFIG = {
  apiKey: 'AIzaSyBZsP2gppSDrhc0-QlrXAaHcbLg-GDP_7E',
  authDomain: 'duelo-de-datos.firebaseapp.com',
  databaseURL: 'https://duelo-de-datos-default-rtdb.firebaseio.com',
  projectId: 'duelo-de-datos',
  appId: '1:1066799020994:web:90ab8a5029e9bb001c345b',
};
const app = initializeApp(CONFIG);
const auth = getAuth(app), db = getDatabase(app);

// Sesión anónima: el uid sobrevive a recargas, así el mismo celular no vota dos veces.
export async function entrar() {
  await auth.authStateReady();
  return (auth.currentUser || (await signInAnonymously(auth)).user).uid;
}

// Una sala por pregunta. Las reglas de salas de la base dejan que cada quien escriba solo su
// propio voto (respuestas/v/<uid>), una vez y mientras la sala está en fase 'pregunta'.
export const ruta = (i, ...partes) => ['salas', SALAS[i], ...partes].join('/');
export const r = (i, ...partes) => ref(db, ruta(i, ...partes));
export const raiz = ref(db);

export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const mostrar = (id) => document.querySelectorAll('main > section').forEach((s) => (s.hidden = s.id !== id));
export const normal = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Opciones de la pregunta i; la de puntajes sale de los pares [práctico, teórico] que edita el anfitrión.
export const opciones = (cfg, i) => cfg.preguntas[i].puntajes
  ? cfg.puntajes.map(([p, t]) => ({ t: `Práctico ${p} · Teórico ${t}` }))
  : cfg.preguntas[i].o;
