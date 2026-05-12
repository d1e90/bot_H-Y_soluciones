require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const puppeteer = require('puppeteer');
const axios = require('axios');
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
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
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
    '¿Qué deseas hacer?',
    Markup.inlineKeyboard([
      [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ])
  );
});

// ============ ACCIONES CON BOTONES ============

bot.action('nuevo_reporte', (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = {
    step: 'cliente',
    data: {}
  };
  
  ctx.editMessageText(
    '📝 *Nuevo Reporte*\n\n' +
    '¿Cuál es el nombre del cliente? (ej: Cocorollo Palmas S.A.S)',
    Markup.inlineKeyboard([
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ])
  );
});

bot.action('cancelar', (ctx) => {
  const userId = ctx.from.id;
  delete userSessions[userId];
  ctx.editMessageText('❌ Reporte cancelado.');
});

bot.action(/^tipo_servicio_(.+)$/, (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  const tipo = ctx.match[1];
  
  session.data.tipoServicio = tipo === 'correctiva' ? 'Limpieza Correctiva' : 'Limpieza Preventiva';
  session.step = 'reportNum';
  
  ctx.editMessageText(
    `✅ Tipo: *${session.data.tipoServicio}*\n\n` +
    '¿Cuál es el número de reporte? (ej: 052)',
    Markup.inlineKeyboard([
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ])
  );
});

bot.action('fotos_listo', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  
  const fotosCount = (session.fotos.array && session.fotos.array.length) || 0;
  
  if (fotosCount < 6) {
    ctx.answerCbQuery(`❌ Mínimo 6 fotos requeridas. Tienes ${fotosCount}.`, true);
    return;
  }
  
  // Guardar fotos en session.data
  session.data.fotos = session.fotos.array;
  session.step = 'insumos';
  
  ctx.editMessageText(
    `✅ *${fotosCount} fotos guardadas.*\n\n` +
    '💊 *Ahora los insumos*\n\n' +
    'Envía los insumos en formato:\n' +
    '`Nombre | Lote | Vencimiento | Concentración | Vencido(S/N)`\n\n' +
    '_Ejemplo:_\n' +
    '`LK Econo Chlor | 251636 | 29/08/2026 | 6% | N`\n' +
    '`Alumi Clean | 249791 | 31/07/2026 | 3% | N`\n' +
    '`Titan 15% | E25070165AF | 14/03/2026 | 400 ppm | S`\n\n' +
    '_Cuando termines, haz clic en "Generar PDF"._',
    Markup.inlineKeyboard([
      [Markup.button.callback('📄 Generar PDF', 'generar_pdf')],
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ])
  );
});

bot.action('generar_pdf', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  
  if (!session || session.step !== 'insumos') {
    ctx.answerCbQuery('Por favor completa los datos del reporte primero.', true);
    return;
  }
  
  if (!session.data.cliente || !session.data.reportNum) {
    ctx.answerCbQuery('❌ Faltan datos obligatorios.', true);
    return;
  }
  
  try {
    await ctx.answerCbQuery('⏳ Generando PDF...');
    
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

    fs.unlink(pdfPath, () => {});

    // Limpiar sesión
    delete userSessions[userId];
    
    await ctx.reply(
      '✅ *¡Reporte generado exitosamente!*\n\n' +
      '¿Deseas crear otro?',
      Markup.inlineKeyboard([
        [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
        [Markup.button.callback('❌ Salir', 'cancelar')]
      ])
    );
  } catch (error) {
    console.error('Error generando reporte:', error);
    ctx.answerCbQuery('❌ Error al generar el PDF. Intenta nuevamente.', true);
  }
});

// ============ MANEJADOR DE TEXTO ============

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  
  if (!session) {
    ctx.reply('Por favor usa /start para iniciar.');
    return;
  }
  
  const text = ctx.message.text.trim();
  
  switch (session.step) {
    case 'cliente':
      session.data.cliente = text;
      session.step = 'tipoServicio';
      ctx.reply(
        `✅ Cliente: *${text}*\n\n` +
        '¿Tipo de servicio?',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔧 Correctiva', 'tipo_servicio_correctiva')],
          [Markup.button.callback('📅 Preventiva', 'tipo_servicio_preventiva')],
          [Markup.button.callback('❌ Cancelar', 'cancelar')]
        ])
      );
      break;
      
    case 'reportNum':
      session.data.reportNum = text;
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
        'Envía entre *6 y 10 fotos* del trabajo realizado.\n' +
        'Puedes incluir:\n' +
        '• Fotos ANTES\n' +
        '• Fotos DURANTE\n' +
        '• Fotos DESPUÉS\n' +
        '• Detalles de equipos\n' +
        '• Zonas de trabajo\n\n' +
        '_Mínimo 6, máximo 10 fotos._\n' +
        '_Cuando termines, haz clic en "Fotos Listo"._',
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ Fotos Listo', 'fotos_listo')],
          [Markup.button.callback('❌ Cancelar', 'cancelar')]
        ])
      );
      session.fotos = { array: [], count: 0 };
      break;
      
    case 'insumos':
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
        if (!session.insumos) session.insumos = [];
        session.insumos.push(insumo);
        session.data.insumos = session.insumos;
        ctx.reply(
          `✅ Insumo agregado: *${parts[0]}*\n\n` +
          `Total insumos: ${session.insumos.length}\n\n` +
          '_Agrega otro insumo o haz clic en "Generar PDF"._',
          Markup.inlineKeyboard([
            [Markup.button.callback('📄 Generar PDF', 'generar_pdf')],
            [Markup.button.callback('❌ Cancelar', 'cancelar')]
          ])
        );
      } else {
        ctx.reply('❌ Formato incorrecto. Usa: `Nombre | Lote | Vencimiento | Concentración | S/N`', { parse_mode: 'Markdown' });
      }
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
    const fotosCount = (session.fotos.array && session.fotos.array.length) || 0;
    
    // Validar límite máximo (10 fotos)
    if (fotosCount >= 10) {
      ctx.reply('⚠️ Ya has alcanzado el máximo de 10 fotos. Haz clic en "Fotos Listo" para continuar.', 
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ Fotos Listo', 'fotos_listo')],
          [Markup.button.callback('❌ Cancelar', 'cancelar')]
        ])
      );
      return;
    }
    
    const file = await ctx.telegram.getFile(ctx.message.photo[ctx.message.photo.length - 1].file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    
    // Convertir a base64
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const b64 = Buffer.from(response.data).toString('base64');
    const mimeType = 'image/jpeg';
    const fotoB64 = `data:${mimeType};base64,${b64}`;
    
    // Guardar en array
    if (!session.fotos.array) {
      session.fotos.array = [];
    }
    session.fotos.array.push(fotoB64);
    
    const nuevaCount = session.fotos.array.length;
    const mensaje = 
      `✅ Foto ${nuevaCount}/10 guardada.\n\n` +
      (nuevaCount >= 6 
        ? '_Tienes mínimo de fotos. Puedes hacer clic en "Fotos Listo" cuando termines, o agregar más (hasta 10)._'
        : `_Falta${10 - nuevaCount === 1 ? '' : 'n'} ${10 - nuevaCount} foto${10 - nuevaCount === 1 ? '' : 's'} para llegar al máximo._`);
    
    if (nuevaCount >= 6) {
      ctx.reply(mensaje, 
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ Fotos Listo', 'fotos_listo')],
          [Markup.button.callback('❌ Cancelar', 'cancelar')]
        ])
      );
    } else {
      ctx.reply(mensaje);
    }
  } catch (error) {
    console.error('Error procesando foto:', error);
    ctx.reply('❌ Error al procesar la foto. Intenta nuevamente.');
  }
});

// ============ ERROR HANDLING ============

bot.catch((err, ctx) => {
  console.error('Error en bot:', err);
  ctx.reply('❌ Ocurrió un error. Por favor intenta de nuevo o usa /start.');
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
