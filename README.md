# H&Y Mundo Servicios — Bot Generador de Reportes

Bot Telegram para generar automáticamente reportes de **limpieza y desinfección correctiva** en formato PDF.

## Características

✅ **Interfaz conversacional** — El bot guía paso a paso la recopilación de datos  
✅ **Fotos integradas** — Soporta captura antes/durante/después  
✅ **Trazabilidad de insumos** — Registro de lotes, vencimientos y concentraciones  
✅ **PDF automático** — Genera reportes en formato A4 con Puppeteer  
✅ **Certificación HACCP** — Cumple normativas de inocuidad alimentaria  

## Instalación

```bash
cd bot
npm install
```

## Configuración

Crea un archivo `.env` en la carpeta `bot/`:

```env
BOT_TOKEN=tu_token_de_telegram_aqui
```

Para obtener un token:
1. Habla con [@BotFather](https://t.me/botfather) en Telegram
2. Crea un nuevo bot con `/newbot`
3. Copia el token proporcionado

## Uso

### Iniciar el bot

```bash
npm start
```

O en modo desarrollo con auto-reload:

```bash
npm run dev
```

### Flujo en Telegram

1. **/start** — Bienvenida e instrucciones
2. **/nuevo** — Iniciar un nuevo reporte
3. **Ingresa datos** — El bot pedirá:
   - Número de reporte
   - Cliente
   - Contacto
   - Ubicación
   - Equipo
   - Fecha y hora
   - Técnicos
   - Observaciones

4. **Sube fotos** — Entre **6 y 10 fotos** (mínimo 6, máximo 10):
   - Puedes subir fotos ANTES, DURANTE, DESPUÉS
   - Detalles de equipos
   - Zonas de trabajo
   - Una vez cargadas, escribe `fotos listo` para continuar

5. **Insumos** — Agrega productos con formato:
   ```
   Nombre | Lote | Vencimiento | Concentración | Vencido(S/N)
   ```
6. **Genera PDF** — Escribe `listo` y recibe el reporte en PDF

### Ejemplo de insumos

```
LK Econo Chlor | 251636 | 29/08/2026 | 6% | N
Alumi Clean | 249791 | 31/07/2026 | 3% | N
Titan 15% | E25070165AF | 14/03/2026 | 400 ppm | S
```

## Estructura del Proyecto

```
/root/H&Y MUNDO SERVICIOS/
├── bot/
│   ├── index.js              # Lógica principal del bot
│   ├── template.js           # Generador de HTML para reportes
│   ├── package.json
│   ├── .env                  # Variables de entorno
│   ├── node_modules/
│   └── pdfs/                 # PDFs generados (temporal)
├── reporte-completo-52.html  # Plantilla de referencia
├── H&Y_LOGO_2.png
├── Logo_H&Y.jpeg
└── README.md
```

## Tecnología

- **Telegraf** — Framework para bots Telegram
- **Puppeteer** — Generación de PDFs desde HTML
- **Dotenv** — Gestión de variables de entorno
- **Axios** — Descargas de archivos

## Notas Importantes

- Los PDFs se generan en memoria y se entregan directamente al usuario
- Las imágenes se convierten a Base64 y se embeben en el HTML
- El token del bot debe mantenerse confidencial (nunca commitear `.env`)
- Puppeteer requiere Chromium (se descarga automáticamente en `npm install`)

## Troubleshooting

### "Cannot find module 'telegraf'"
```bash
npm install
```

### Error de Puppeteer
```bash
npm install puppeteer --force
```

### Bot no responde
1. Verifica que `BOT_TOKEN` sea válido en `.env`
2. Asegúrate de tener conexión a internet
3. Revisa los logs en la terminal

## Desarrollo Futuro

- [ ] Base de datos para histórico de reportes
- [ ] Plantillas adicionales (preventiva, especiales)
- [ ] Validación de datos en tiempo real
- [ ] Generación de reportes en Excel
- [ ] Dashboard web con reportes
- [ ] Integración con API de clientes

---

**H&Y Mundo Servicios S.A.S — Inocuar L&D Total**  
Medellín, Antioquia, Colombia  
inocuarldtotal@gmail.com · +57 300 151 6187
