# Defensa oral — banco de preguntas (2026-10-15)

**Para:** solo el profesor.  
**Rúbrica:** [`PHASE-V-FEII-COHORT-COLLABORATION-AND-ASSESSMENT.md`](../PHASE-V-FEII-COHORT-COLLABORATION-AND-ASSESSMENT.md) §6  
**English:** [`ORAL-DEFENSE-QUESTIONS-2026-10-15.md`](./ORAL-DEFENSE-QUESTIONS-2026-10-15.md)

**Cómo usarlo en sala**

1. Elige **una** pregunta del trío del equipo.
2. Las otras dos quedan de reserva.
3. Al final, 3–4 minutos para las preguntas M1–M3 (método docente). Cualquier alumno, o un voluntario por equipo.

Cada trío tiene tres focos:

| # | Foco | Qué comprueba |
| --- | --- | --- |
| 1 | Decisión en vuestro código | Entendéis lo que mergeasteis |
| 2 | Uso crítico de la IA | No aceptasteis ciegamente al asistente |
| 3 | El sistema entero | Sabéis qué hace otro equipo que os toca |

---

## E1 — Contenido (`gontugithub`)

*Tips mergeados: #61–#68 (+ #43). Tareas 7–8 (PR / revisión en módulo ajeno) **exentas**.*

1. **¿Por qué la proveniencia no puede vivir solo en el detalle?**  
   La tarea 5 pide licencia/fuente/proveniencia en el índice, en las facetas y en el detalle. Si solo aparece en el detalle, ¿qué ve mal quien solo hojea las tarjetas? Dad un ejemplo concreto.

2. **El asistente dice: «el test de `frequencies()` ya cubre el formulario».**  
   #67 se rechazó por eso. Sin volver a lanzar toda la suite: ¿qué hace el formulario (enviar, validar, mensaje de error…) que `frequencies()` nunca ejecuta? ¿Qué tendría que comprobar un test del *componente* del formulario?

3. **Errores de `loadWisdom()`: ¿página vacía o página de error?**  
   Si falla el fetch, ¿dónde debe verse un error claro para el usuario, y dónde sería mentira mostrar «no hay citas»? Si Graph o Accounts usan el mismo camino de datos, ¿quién hereda esa regla?

---

## E2 — Grafo (`gpfc-git`)

*Tareas 1–8 en `main` (#48 … #78). Tarea 9 **exenta**. Tarea 10: sin tip PR en el repo.*

1. **`pushState` vs `replaceState`.**  
   En #71, al elegir un nodo o un tag usáis `pushState` (entra en el historial). Al corregir una URL inválida usáis `replaceState` (no ensucia el historial). Si *todo* fuera `pushState`, incluido limpiar un `?tag=basura` al cargar: ¿qué bug concreto vería el usuario al pulsar Atrás?

2. **Flechas: lista ±1 vs navegación espacial.**  
   En #52 pasasteis de «siguiente/anterior en la lista» a «el nodo más cercano en la dirección de la flecha». ¿Por qué ±1 falla en un layout en círculo? ¿Lo propuso primero la IA? ¿Qué prueba (test, Tab a mano, coordenadas) os convenció de cambiar?

3. **Filtro, selección y foco.**  
   Si el filtro quita el nodo que tenía el foco, el foco vuelve al `<select>` del filtro (#55 / #76). ¿Eso lo decide el layout, la URL, o `applyTag` en la isla? Si alguien abre `?node=arch-001` desde otra página, ¿qué *no* debe asumir sobre el foco?

---

## E3 — Oráculo (`Andreavilaro0` / fork `nbfrodri`)

*Costura hecha con el PR acumulativo #42. Los PRs sueltos #44/#45/#38–#41 se cerraron porque ya estaban en `main`. Tareas 8–9 (PR / revisión en módulo ajeno) **exentas**.*

1. **«Está en `main`» no es lo mismo que «este PR se puede mergear».**  
   El código de las tareas 1–6 entró por #42. Los PRs viejos por tarea seguían sucios. Explicad la diferencia. ¿Por qué cerrarlos no borra el trabajo ya mergeado?

2. **Streaming: no mentir al usuario.**  
   Elegid *preparing*, la región en vivo, o el error de recuperación. Dad un ejemplo de lo que un asistente podría haber hecho mal (p. ej. anunciar la respuesta completa antes de que acabe el stream). ¿Cómo lo comprobasteis: test o navegador?

3. **Offline: shell del Oráculo vs respuesta del modelo.**  
   PWA cachea la *página* del Oráculo; no inventa la respuesta del LLM. Si el usuario envía sin red: ¿qué debe ver? ¿Eso lo escribe vuestro módulo o la cola offline de PWA?

---

## E4 — PWA (`PRNovoa`)

*Costura hecha (#51→#69). Memoria de uso de IA: #74. Tareas 8–9 (PR / revisión en módulo ajeno) **exentas**.*

1. **Cache-First vs Network-First.**  
   Dad un tipo de fichero que deba ir Cache-First (p. ej. CSS/JS estático) y un path que deba ir a la red (p. ej. el stream del Oráculo). Si los intercambiáis, ¿qué falla a ojos del usuario?

2. **Rechazasteis quitar `tsc` del monitor (#74 / #49).**  
   La IA proponía quitar TypeScript del monitor porque tropezaba con imports `.astro`. ¿Por qué era peligroso? ¿Qué bug (p. ej. atributos JSX duplicados / `TS17001`) se colaría con el monitor en verde? ¿Qué solución mantuvisteis?

3. **Cola offline y credenciales.**  
   Al volver `online`, la cola reenvía peticiones. ¿Puede usar la cookie de sesión? ¿Puede usar un Bearer PAT? ¿Cómo encaja eso con la regla de Accounts (sesión ≠ token de API)?

---

## E5 — Cuentas (`alexxblaro16` / `Gonsiii11`)

*Costura hecha (#53→#59). Tareas 8–9 (PR / revisión en módulo ajeno) **exentas**.*

1. **Dos credenciales, una API.**  
   ¿Por qué la cookie de sesión *no* debe valer para `GET /api/v1/wisdom/random`? ¿Por qué un Bearer PAT *no* debe actuar como sesión del navegador? ¿Qué mala práctica o ataque evita esa separación?

2. **FavoriteButton: ¿índice o detalle? (#58)**  
   Un amend lo movió al detalle. Si la IA dice «pon el botón donde salga el texto de la cita», ¿por qué el detalle es mejor (accesibilidad, SSR, tarjetas densas)?

3. **De la propuesta al corpus.**  
   Seguíd el camino: formulario con sesión → cola de reviewer → aceptación. ¿Dónde acaba la UI de Content y dónde empieza vuestro backend (`ProposalStore`, `origin`…)? ¿Qué campos el cliente *no* debe inventar?

---

## El alumnado evalúa el método docente (3 preguntas)

No evalúan su código: evalúan **cómo se enseñó**. Priorizad honestidad y ejemplos concretos, no el elogio.

**M1 — App real vs ejercicio de juguete.**  
Usamos una sola app TTOD, PRs pequeños (un tip), el profesor actualizaba ramas / resolvía conflictos, y los rechazos pedían solo código o verificación (no «actualiza main»). ¿Os enseñó eso la revisión profesional, o escondió demasiado el git complicado? Dad un PR concreto.

**M2 — La IA obligatoria en el proceso, no prohibida.**  
Unidad 6, tablas AI Review Log, «la IA no aprueba», ejemplos de rechazo (`tsc` en #74, flechas del grafo, login vacío / FavoriteButton). ¿Qué ritual os cambió de verdad al usar asistentes? ¿Cuál os pareció papeleo? Si rediseñáis el curso, ¿qué mantendríais?

**M3 — Un módulo propio, pero defensa de todo el sistema.**  
Cada equipo tenía una costura; la defensa pide entender el resto. ¿Trabajar todos a la vez sobre el mismo `main` fue la forma correcta, o habría sido mejor ir en serie / con stubs? Argumentad con una dependencia real entre equipos (una que os tocó o una que evitasteis).

---

## Notas para el examinador

- Mejor respuesta: **archivo, número de PR o check de CI** — no eslóganes.
- «Miraría X» cuenta como recuperación válida (§6).
- En #65–#68 sin amend: no suspendáis la defensa por eso; preguntad qué harían ahora y si el rechazo era justo.
- En M1–M3: cortad el elogio; pedid también un **coste** del método (tiempo, confusión, sensación de injusticia).

---

_2026-10-15 · ES revisada para claridad en sala. EN: misma fecha._
