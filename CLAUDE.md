# H&Y Mundo Servicios — Bot Generador de Reportes

Bot Telegram (Node.js CommonJS) que recolecta datos vía flujo conversacional y genera PDFs con Puppeteer. Sin TypeScript, sin build step, sin test suite.

## Commands

```bash
cd bot && npm run dev   # desarrollo con auto-reload (node --watch)
cd bot && npm start     # producción
```

No hay step de build. Si el bot no arranca, verificar que `bot/.env` tenga `BOT_TOKEN`.

## Architecture

```
bot/index.js      — bot logic: handlers Telegraf, state machine, dispatch PDF
bot/template.js   — HTML generator: función pura buildHTML(data) → string HTML
bot/pdfs/         — PDFs temporales (se acumulan, no se limpian automáticamente)
```

`userSessions[userId]` almacena el estado en memoria — se pierde si el proceso se reinicia.

Flujo completo: handler Telegraf → `userSessions` state machine → `buildHTML()` → Puppeteer → `ctx.replyWithDocument()`.

<important if="adding, removing, or reordering steps in the conversation flow">

## State Machine

El flujo de steps es secuencial y lineal. Orden exacto:

`cliente → tipoServicio → reportNum → contacto → ubicacion → equipo → fecha → horario → tecnicos → observaciones → fotos → insumos`

Agregar un step en el medio sin actualizar los handlers subsiguientes rompe el flujo silenciosamente — el usuario queda atascado sin mensaje de error visible.

</important>

## Conventions

- `require()` siempre al top del archivo. Hay una excepción existente en `index.js` (~línea 329, axios dentro del photo handler) — no replicar ese patrón.
- `camelCase` para variables y funciones.
- Strings de mensajes Telegram en español, hardcodeados directamente — sin i18n.
- No agregar TypeScript, ESLint ni transpilación.

## Edit vs Create

- Nuevos pasos del flujo conversacional o comandos → editar `bot/index.js`
- Cambios visuales o de contenido del PDF → editar `bot/template.js`
- Nuevo tipo de reporte con estructura distinta (ej: reporte preventivo) → crear `bot/template-preventivo.js` con su propio `buildHTML`

## DO NOT

- No `require()` dentro de handlers o funciones — siempre al top del archivo
- No guardar fotos e insumos en construcción dentro de `session.data` — van en `session.fotos` / `session.insumos` separados, y se mueven a `session.data` solo cuando están completos (patrón que ya existe, no romperlo)
- No instanciar un browser Puppeteer global — uno por generación de PDF, cerrarlo siempre en el bloque finally
- No hardcodear colores hex en `template.js` — usar variables CSS de `:root`
- No agregar una sección al PDF sin revisar y corregir todos los `section-num` dinámicos en las secciones subsiguientes

## Verification

No hay test suite. Para confirmar que un cambio funciona:

1. `cd bot && npm run dev` debe arrancar sin errores en consola
2. En Telegram: `/start` → `Nuevo Reporte` → completar todos los campos → subir 6+ fotos → agregar insumos con el asistente paso a paso (nombre, lote, vencimiento, concentración, vencido) → revisar el resumen → `Generar PDF` → recibir PDF en el chat
