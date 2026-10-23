# Votación en vivo

Votación corta con resultados al momento. Cada persona vota una sola vez, con su nombre y apellido.

## Cómo se usa

1. El anfitrión abre `panel.html` con su clave (o con el enlace `panel.html#clave=<clave>`), ajusta las opciones de puntaje y abre la votación.
2. Cada persona abre la página principal en su celular, escribe su nombre y apellido y responde una pregunta por pantalla.
3. El panel muestra los resultados en vivo. Si un nombre se repite, solo cuenta el primer voto; se pueden quitar votos y descargar un CSV.

## Cómo funciona

- Página estática con Firebase Realtime Database e inicio de sesión anónimo.
- Cada pregunta es una sala; las reglas de la base solo dejan que cada quien escriba su propio voto, una vez, mientras la votación está abierta.
- Solo el anfitrión controla las salas. Su sesión va cifrada en `acceso.js` (AES-GCM, clave derivada con PBKDF2) y solo se abre con su clave.
- Los textos de las preguntas viven en la base; `node crear.mjs` crea la votación la primera vez y después actualiza los textos desde `encuesta.json` (archivo local, no se publica).
