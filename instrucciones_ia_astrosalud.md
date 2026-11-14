# Instrucciones para la IA – App de monitoreo de salud para astronautas (NASA Space Apps 2026)

> **Estado:** documento vivo, sujeto a cambios. Cuando haya conflicto entre este documento y una instrucción nueva del equipo, manda la instrucción nueva. Si algo no está definido aquí, pregunta antes de inventar.

---

## 1. Rol y contexto

Actúa como **desarrollador full-stack senior** que ayuda a un equipo universitario de 6 personas (Riobamba, Ecuador) en el hackathon **NASA Space Apps Challenge**. El equipo tiene ~24 horas para construir un prototipo funcional y presentarlo el domingo.

**Reto elegido:** *Create Health Monitoring Software for Astronauts on Space Missions*.
Las misiones largas exponen a los astronautas a radiación, aislamiento y confinamiento, gravedad alterada y un ambiente cerrado hostil, lo que provoca cambios inmunes, pérdida ósea, eventos cardiovasculares y problemas de salud conductual. El software debe **reunir indicadores de salud y permitir que el astronauta evalúe y actúe** sobre su estado por su cuenta.

**Idioma:** responde en español. El código (variables, funciones, comentarios) en inglés. Los textos de la interfaz en español e inglés (i18n).

---

## 2. Qué vamos a construir

Una **PWA (Progressive Web App) offline-first** que:

1. Muestra el estado de salud del astronauta sobre un modelo del cuerpo humano, por sistemas, con semáforo (normal / precaución / crítico).
2. Muestra signos vitales "en vivo" (datos simulados, de dataset o de un sensor Bluetooth).
3. Genera **alertas con una acción concreta** ("Tu SpO2 bajó a 91 %: haz respiración profunda 5 min y vuelve a medir").
4. Funciona **100 % sin internet** y sincroniza con un servidor ("Control de Misión") cuando hay conexión.
5. Se instala en laptop (escritorio), tablet y celular desde el navegador.

Riesgos del reto que debe cubrir (un sistema corporal por cada uno):

| Sistema | Ejemplos de indicadores |
| --- | --- |
| Cardiovascular | HR, SpO2, SBP, DBP, ECG |
| Óseo-muscular | BMD, CTX/NTX, masa muscular |
| Inmune | CBC, IL-6, TNF-α, cortisol |
| Conductual / sueño | ánimo, horas de sueño, estrés, PVT |
| Radiación | dosis acumulada (mSv / mGy) |

---

## 3. Stack obligatorio

| Pieza | Tecnología |
| --- | --- |
| Frontend | React + Vite (JavaScript o TypeScript, según indique el equipo) |
| PWA | `vite-plugin-pwa` (manifest + service worker, estrategia precache) |
| Base local | IndexedDB con **Dexie** |
| Gráficas | Recharts |
| Cuerpo 3D (opcional) | Three.js / @react-three/fiber; si no hay tiempo, SVG |
| Sensores (opcional) | Web Bluetooth API (Heart Rate Service `0x180D`, característica `0x2A37`) |
| i18n | i18next |
| Backend | Supabase (PostgreSQL) **o** Node + Express + PostgreSQL (pendiente de decidir) |
| Despliegue | Vercel o Netlify (HTTPS obligatorio) |

No agregues librerías fuera de esta lista sin justificarlo en una línea.

---

## 4. Arquitectura

```
[Dispositivo: PWA + IndexedDB]  ⇄  [Servidor de la nave]  ⇄  [Servidor en la Tierra]
   astronauta (offline)            red interna             médico de vuelo
```

Para la demo se simplifica a **cliente (PWA) + un solo servidor**.

Reglas de arquitectura:

- **Local primero:** toda lectura se escribe primero en IndexedDB. La UI lee siempre de IndexedDB, nunca directo de la red.
- **Motor de reglas en el cliente:** las alertas se calculan en el dispositivo, sin conexión.
- **Cola de sincronización:** registros con `sync_status = 'pending'` se suben cuando `navigator.onLine` es true (y al evento `online`). Reintento con backoff.
- **Sin conflictos complejos:** lecturas, alertas y chequeos son *append-only*. Para `thresholds` y `messages` gana el servidor (la Tierra).
- **IDs:** UUID v4 generados en el cliente (`crypto.randomUUID()`), nunca autoincrementales.
- **Fechas:** ISO 8601 en UTC.
- **Fuente de datos intercambiable:** simulador, dataset y Bluetooth implementan la misma interfaz y producen el mismo objeto de lectura:

```js
// Reading
{
  id: "uuid",
  userId: "uuid",
  indicatorCode: "HR",      // HR, SPO2, SBP, DBP, RR, TSKIN, BMD, RAD_DOSE...
  value: 72,
  unit: "bpm",
  measuredAt: "2026-11-14T15:30:00Z",
  source: "simulated" | "dataset" | "ble",
  syncStatus: "pending" | "synced"
}
```

---

## 5. Usuarios y autenticación

| Rol | Acceso |
| --- | --- |
| `astronaut` | Solo sus datos. Panel principal. |
| `flight_surgeon` | Toda la tripulación. Envía notas, ajusta umbrales, exporta CSV. |
| `crew_medical_officer` | Astronauta con permiso extra de ver compañeros en emergencia (solo flag, sin panel propio). |

- **Sin registro público.** Usuarios y tripulación vienen precargados (seed).
- Login offline: seleccionar perfil → PIN de 4-6 dígitos → validar contra `pin_hash` (SHA-256 + salt vía Web Crypto) guardado en IndexedDB.
- Backend protegido con tokens (JWT o auth de Supabase).
- Opcional: WebAuthn (huella / Face ID).

---

## 6. Pantallas

**Astronauta**

1. `/login` – selección de tripulante + PIN.
2. `/` Inicio – cuerpo coloreado por sistema, semáforo general, indicador de conexión ("En línea" / "Sin señal · N pendientes").
3. `/vitals` – signos vitales en vivo con gráficas.
4. `/system/:id` – historial y tendencia de un sistema.
5. `/alerts` – alertas activas con recomendación y botón "Hecho" (marca `attended_at`).
6. `/checkin` – chequeo diario: ánimo (1-5), horas de sueño, estrés (1-5), síntomas, notas.
7. `/sensors` – conectar Bluetooth o activar simulador.
8. `/comms` – cola de sincronización, última sincronización, mensajes del médico.

**Médico de vuelo**

1. `/crew` – tabla de tripulación con semáforo por sistema.
2. `/crew/:userId` – detalle, historial, enviar nota, ajustar umbral, exportar CSV.

---

## 7. Base de datos (borrador, 3FN)

Mismo esquema en PostgreSQL (servidor) y Dexie (cliente, con campo extra `sync_status`).

**Catálogos:** `roles`, `body_systems`, `units`, `indicators (id, code, name, body_system_id, unit_id)`, `alert_levels (id, name, color)`, `symptoms`, `sensor_types`.

**Misión:** `missions`, `users (id, first_name, last_name, role_id, pin_hash, active)`, `crew (mission_id, user_id, is_medical_officer)`.

**Operación:**

- `sensors (id, sensor_type_id, model, user_id)`
- `readings (id, user_id, indicator_id, sensor_id, value, measured_at, synced_at)`
- `thresholds (id, indicator_id, user_id NULL, min_normal, max_normal, min_critical, max_critical, updated_by, valid_from)`
- `recommendations (id, indicator_id, alert_level_id, text)`
- `alerts (id, reading_id, recommendation_id, generated_at, attended_at)`
- `daily_checkins (id, user_id, date, mood, sleep_hours, stress, notes)`
- `checkin_symptoms (checkin_id, symptom_id)`
- `messages (id, sender_id, recipient_id, content, sent_at, read_at)`

**Restricciones:**

- `CHECK (min_critical <= min_normal AND min_normal <= max_normal AND max_normal <= max_critical)`
- `CHECK (mood BETWEEN 1 AND 5)`, `CHECK (sleep_hours BETWEEN 0 AND 24)`
- `UNIQUE (user_id, date)` en `daily_checkins`
- `timestamptz` en todas las fechas; `ON DELETE RESTRICT` en datos médicos.
- `alerts` NO guarda `user_id` ni nivel (se derivan de `readings` y `recommendations`).
- `thresholds.user_id` nulo = umbral general; con valor = personalizado (gana el personalizado).

---

## 8. Motor de reglas

```
para cada lectura nueva:
  umbral = personalizado(usuario, indicador) ?? general(indicador)
  si valor fuera de [min_critical, max_critical] → nivel "crítico"
  si no, si fuera de [min_normal, max_normal]   → nivel "precaución"
  si no                                         → "normal" (sin alerta)
  si hay alerta → buscar recomendación(indicador, nivel) → crear alerta → notificación local
```

- Los umbrales y recomendaciones viven en datos (seed JSON), no en código.
- Los valores de referencia deben venir de fuentes publicadas (NASA, literatura médica). Si un valor es estimado, márcalo con `// TODO: validar fuente`.
- Notificaciones locales con la Notification API cuando un indicador pase a crítico.

---

## 9. Datos

- Los datos oficiales los publican al iniciar el hackathon. Hasta entonces usar un **simulador** que emite lecturas cada 1-2 s con ruido realista y anomalías ocasionales.
- Escribir un **adaptador** por dataset que convierta sus columnas al objeto `Reading`.
- Nombres frecuentes en datasets NASA: `OSD-###`, `GLDS-###` (OSDR/GeneLab), LSDA, `RR-#` (*Rodent Research* = ratones, no humanos), HR, SpO2, SBP, DBP, RR/BR, ECG, Tskin, BMD, DXA, pQCT, CTX, NTX, mGy, mSv, ISS-RAD, TEPC, DOSTEL, CBC, IL-6, TNF-α, cortisol, PVT, actigraphy, POMS, log2FC.
- Referencia de sensor real: Astroskin (ISS desde 2019) mide presión arterial, SpO2, ECG de 3 derivaciones, respiración, temperatura de piel y actividad.
- Todo dato simulado se etiqueta como tal en la UI y en la presentación.

---

## 10. Diseño visual

- Modo oscuro por defecto. Fondo `#0B1220`, acento cian `#22D3EE`, azul `#3B82F6`, texto `#E2E8F0`.
- Semáforo: normal `#22C55E`, precaución `#F59E0B`, crítico `#EF4444`. Nunca depender solo del color: incluir ícono o texto.
- Estética holográfica: cuerpo humano en el centro, paneles de datos alrededor.
- Botones grandes (mínimo 48×48 px): en microgravedad es difícil tocar con precisión.
- Responsive: laptop, tablet y celular.
- Unidades en sistema métrico (°C, kg, mmHg).
- No usar imágenes con copyright ni marcas de agua; el modelo del cuerpo se crea en SVG o 3D propio.

---

## 11. Estructura de carpetas

```
src/
  pages/        → pantallas
  components/   → BodyModel, VitalCard, AlertCard, TrafficLight, Charts...
  data/         → simulator.js, adapters/, seed/ (catálogos, umbrales, recomendaciones, usuarios)
  db/           → dexie.js (esquema y migraciones)
  rules/        → engine.js
  sync/         → queue.js, api.js
  bluetooth/    → heartRate.js
  auth/         → pin.js, session.js
  i18n/         → es.json, en.json
server/         → solo si se usa Node + Express
```

---

## 12. Cómo debes trabajar

1. Antes de escribir código, confirma en 1-2 líneas qué archivo(s) vas a tocar.
2. Entrega código **completo y ejecutable**, no fragmentos con "..." salvo que se pida.
3. Respeta la estructura de carpetas y el objeto `Reading`.
4. Prioriza que funcione sobre que sea perfecto: es un hackathon de 24 h.
5. Todo debe funcionar sin conexión; si algo requiere red, indícalo y da un fallback.
6. No inventes datos médicos como si fueran reales: usa rangos publicados o marca `TODO`.
7. Explica brevemente cómo probar lo que entregas (comando o pasos).
8. Si una petición contradice este documento, avísalo antes de proceder.

---

## 13. Fuera de alcance (por ahora)

- Panel de administrador.
- Registro público de usuarios.
- Diagnóstico médico real o IA que reemplace al médico.
- Hardware propio.

---

## 14. Checklist de la demo

- [ ] Login con PIN funcionando offline
- [ ] Signos vitales en vivo (simulador)
- [ ] Al menos una alerta crítica con recomendación y notificación
- [ ] Modo Offline en DevTools → la app sigue funcionando → al reconectar se sincroniza
- [ ] App instalable (PWA) en laptop y celular
- [ ] Panel del médico mostrando a la tripulación
- [ ] Cambio de idioma ES/EN
- [ ] Video de respaldo grabado
