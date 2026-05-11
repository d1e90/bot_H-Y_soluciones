require('dotenv').config();
const { Telegraf } = require('telegraf');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { buildHTML } = require('./template');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Almacenamiento temporal de datos por usuario
const userSessions = {};

// ============ UTILIDADES ============

async function htmlToPdf(htmlContent, filename) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
    
    const pdfPath = path.join(__dirname, 'pdfs', filename);
    if (!fs.existsSync(path.join(__dirname, 'pdfs'))) {
      fs.mkdirSync(path.join(__dirname, 'pdfs'), { recursive: true });
    }
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    
    await browser.close();
    return pdfPath;
  } catch (error) {
    console.error('Error generando PDF:', error);
    if (browser) await browser.close();
    throw error;
  }
}

// ============ COMANDOS ============

bot.start((ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = {};
  
  ctx.reply(
    '🤝 *¡Bienvenido a H&Y Generador de Reportes!*\n\n' +
    'Soy un bot para generar reportes de limpieza y desinfección.\n\n' +
    'Comandos disponibles:\n' +
    '📋 /nuevo — Iniciar nuevo reporte\n' +
    '❌ /cancelar — Cancelar reporte actual\n\n' +
    '¿Comenzamos?',
    { parse_mode: 'Markdown' }
  );
});

bot.command('nuevo', (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = {
    step: 'reportNum',
    data: {}
  };
  
  ctx.reply(
    '📝 *Nuevo Reporte*\n\n' +
    '¿Cuál es el número de reporte? (ej: 052)',
    { parse_mode: 'Markdown' }
  );
});

bot.command('cancelar', (ctx) => {
  const userId = ctx.from.id;
  delete userSessions[userId];
  ctx.reply('❌ Reporte cancelado.');
});

// ============ MANEJADOR DE TEXTO ============

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  
  if (!session) {
    ctx.reply('Por favor usa /nuevo para iniciar un reporte.');
    return;
  }
  
  const text = ctx.message.text.trim();
  
  switch (session.step) {
    case 'reportNum':
      session.data.reportNum = text;
      session.step = 'cliente';
      ctx.reply('¿Nombre del cliente? (ej: Cocorollo Palmas S.A.S)');
      break;
      
    case 'cliente':
      session.data.cliente = text;
      session.step = 'contacto';
      ctx.reply('¿Contacto en sitio? (ej: Sergio Gómez / Carlos Muñoz)');
      break;
      
    case 'contacto':
      session.data.contacto = text;
      session.step = 'ubicacion';
      ctx.reply('¿Ubicación? (ej: Km 10, retorno 10 vía Las Palmas)');
      break;
      
    case 'ubicacion':
      session.data.ubicacion = text;
      session.step = 'equipo';
      ctx.reply('¿Equipo intervenido? (ej: Parrilla 6 Toneladas)');
      break;
      
    case 'equipo':
      session.data.equipo = text;
      session.step = 'fecha';
      ctx.reply('¿Fecha de ejecución? (ej: 28 de Abril de 2026)');
      break;
      
    case 'fecha':
      session.data.fecha = text;
      session.step = 'horario';
      ctx.reply('¿Horario de intervención? (ej: 23:00 — 04:00)');
      break;
      
    case 'horario':
      session.data.horario = text;
      session.step = 'tecnicos';
      ctx.reply('¿Técnicos? (separados por coma, ej: Geimer España, Juan Cano)');
      break;
      
    case 'tecnicos':
      session.data.tecnicos = text;
      session.step = 'observaciones';
      ctx.reply('¿Observaciones adicionales? (o escribe "—" si no hay)');
      break;
      
    case 'observaciones':
      session.data.observaciones = text;
      session.step = 'fotos';
      ctx.reply(
        '📸 *Envía las fotos del reporte*\n\n' +
        'Envía 3 fotos en este orden:\n' +
        '1️⃣ Foto ANTES (estado inicial)\n' +
        '2️⃣ Foto DURANTE (en proceso)\n' +
        '3️⃣ Foto DESPUÉS (resultado final)\n\n' +
        '_Escribe "skip" para continuar sin fotos._',
        { parse_mode: 'Markdown' }
      );
      session.fotos = { count: 0 };
      break;
  }
});

// ============ MANEJADOR DE FOTOS ============

bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  
  if (!session || session.step !== 'fotos') {
    return;
  }
  
  try {
    const photoCount = session.fotos.count || 0;
    const file = await ctx.telegram.getFile(ctx.message.photo[ctx.message.photo.length - 1].file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    
    // Convertir a base64
    const axios = require('axios');
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const b64 = Buffer.from(response.data).toString('base64');
    const mimeType = 'image/jpeg';
    const fotoB64 = `data:${mimeType};base64,${b64}`;
    
    if (photoCount === 0) {
      session.data.fotoAntes = fotoB64;
      ctx.reply('✅ Foto ANTES guardada. Envía la foto DURANTE.');
    } else if (photoCount === 1) {
      session.data.fotoDurante = fotoB64;
      ctx.reply('✅ Foto DURANTE guardada. Envía la foto DESPUÉS.');
    } else if (photoCount === 2) {
      session.data.fotoDespues = fotoB64;
      session.step = 'insumos';
      ctx.reply(
        '✅ Fotos completas.\n\n' +
        '💊 *Ahora los insumos*\n\n' +
        'Envía los insumos en formato:\n' +
        '`Nombre | Lote | Vencimiento | Concentración | Vencido(S/N)`\n\n' +
        '_Ejemplo:_\n' +
        '`LK Econo Chlor | 251636 | 29/08/2026 | 6% | N`\n' +
        '`Alumi Clean | 249791 | 31/07/2026 | 3% | N`\n' +
        '`Titan 15% | E25070165AF | 14/03/2026 | 400 ppm | S`\n\n' +
        '_Cuando termines, escribe "listo" para generar el reporte._',
        { parse_mode: 'Markdown' }
      );
      session.insumos = [];
    }
    session.fotos.count = (photoCount || 0) + 1;
  } catch (error) {
    console.error('Error procesando foto:', error);
    ctx.reply('❌ Error al procesar la foto. Intenta nuevamente.');
  }
});

// ============ MANEJADOR DE INSUMOS ============

bot.hears(/^listo$/i, async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  
  if (!session || session.step !== 'insumos') {
    ctx.reply('Por favor completa los datos del reporte primero.');
    return;
  }
  
  if (!session.data.cliente || !session.data.reportNum) {
    ctx.reply('❌ Faltan datos obligatorios. Usa /nuevo para reiniciar.');
    return;
  }
  
  try {
    ctx.reply('⏳ Generando PDF, por favor espera...');
    
    const htmlContent = buildHTML(session.data);
    const filename = `reporte-${session.data.reportNum}-${Date.now()}.pdf`;
    const pdfPath = await htmlToPdf(htmlContent, filename);
    
    await ctx.replyWithDocument(
      { source: pdfPath },
      {
        caption: `📄 Reporte #${session.data.reportNum} — ${session.data.cliente}`,
        parse_mode: 'Markdown'
      }
    );
    
    // Limpiar sesión
    delete userSessions[userId];
    
    ctx.reply(
      '✅ *¡Reporte generado exitosamente!*\n\n' +
      'Usa /nuevo para crear otro reporte.',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error generando reporte:', error);
    ctx.reply('❌ Error al generar el PDF. Intenta nuevamente.');
  }
});

// Manejador de insumos mientras estén en ese paso
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  
  if (!session || session.step !== 'insumos') return;
  
  const text = ctx.message.text.trim();
  
  if (text.toLowerCase() === 'listo') {
    return; // Manejado por hears()
  }
  
  // Parsear insumo
  const parts = text.split('|').map(p => p.trim());
  if (parts.length === 5) {
    const insumo = {
      nombre: parts[0],
      lote: parts[1],
      vencimiento: parts[2],
      concentracion: parts[3],
      vencido: parts[4].toLowerCase() === 's'
    };
    session.insumos.push(insumo);
    session.data.insumos = session.insumos;
    ctx.reply(`✅ Insumo agregado: *${parts[0]}*\n\nEscribe otro insumo o escribe *listo* para generar el reporte.`, { parse_mode: 'Markdown' });
  } else {
    ctx.reply('❌ Formato incorrecto. Usa: `Nombre | Lote | Vencimiento | Concentración | S/N`', { parse_mode: 'Markdown' });
  }
});

// ============ ERROR HANDLING ============

bot.catch((err, ctx) => {
  console.error('Error en bot:', err);
  ctx.reply('❌ Ocurrió un error. Por favor intenta de nuevo o usa /nuevo.');
});

// ============ INICIAR BOT ============

bot.launch().then(() => {
  console.log('✅ Bot iniciado. Escuchando mensajes...');
}).catch(err => {
  console.error('❌ Error al iniciar bot:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
