require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const puppeteer = require('puppeteer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { buildHTML } = require('./template');
const { buildDOCX } = require('./template-docx');

const bot = new Telegraf(process.env.BOT_TOKEN);

const userSessions = {};

// Lista de IDs autorizados. Vacía = acceso libre (cualquiera puede usar el bot).
// Para restringir: agrega IDs separados por coma en la variable ALLOWED_IDS del .env
// Ej: ALLOWED_IDS=123456789,987654321
const ALLOWED_IDS = process.env.ALLOWED_IDS
  ? process.env.ALLOWED_IDS.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean)
  : [];

function isAllowed(userId) {
  return ALLOWED_IDS.length === 0 || ALLOWED_IDS.includes(userId);
}

// ============ UTILIDADES ============

async function htmlToPdf(htmlContent, filename) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
      ],
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

  if (!isAllowed(userId)) {
    return ctx.reply(
      '🔐 *Bot H&Y — Acceso restringido*\n\n' +
      'Este bot genera *reportes técnicos profesionales* de limpieza y desinfección en PDF, directamente desde tu celular.\n\n' +
      'Para solicitar acceso, comparte tu ID con H&Y Mundo Servicios:\n\n' +
      `📌 *Tu ID de Telegram:*\n\`${userId}\`\n\n` +
      '📞 +57 302 390 3192\n' +
      '📧 inocuarldtotal@gmail.com',
      { parse_mode: 'Markdown' }
    );
  }

  ctx.reply(
    '👋 *¡Bienvenido, tienes acceso!*\n' +
    '*H&Y Mundo Servicios — Generador de Reportes*\n\n' +
    `📌 Tu ID de Telegram: \`${userId}\`\n\n` +
    '✅ Genera reportes PDF profesionales en minutos\n' +
    '📸 Registro fotográfico embebido\n' +
    '📋 Trazabilidad de insumos con lotes y vencimientos\n' +
    '✍️ Firmas y certificación HACCP\n\n' +
    '¿Qué deseas hacer?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ]) }
  );
});

bot.command('cancelar', (ctx) => {
  const userId = ctx.from.id;
  delete userSessions[userId];
  ctx.reply('❌ Reporte cancelado. Usa /start para comenzar de nuevo.');
});

// ============ ACCIONES CON BOTONES ============

bot.action('nuevo_reporte', (ctx) => {
  const userId = ctx.from.id;
  if (!isAllowed(userId)) return ctx.answerCbQuery('Sin acceso autorizado.', true);
  userSessions[userId] = {
    step: 'cliente',
    data: {}
  };

  ctx.editMessageText(
    '📝 *Nuevo Reporte* — _Paso 1 de 12_\n\n' +
    '¿Cuál es el nombre del cliente?\n' +
    '_Ej: Cocorollo Palmas S.A.S_',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ]) }
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
    '_Paso 3 de 12_\n' +
    '¿Cuál es el número de reporte?\n' +
    '_Ej: 052_',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ]) }
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

  session.data.fotos = session.fotos.array;
  session.step = 'insumos';

  ctx.editMessageText(
    `✅ *${fotosCount} fotos guardadas.*\n\n` +
    '_Paso 12 de 12_\n\n' +
    '💊 *Insumos utilizados*\n\n' +
    'Envía cada insumo en el formato:\n' +
    '`Nombre | Lote | Vencimiento | Concentración | Vencido(S/N)`\n\n' +
    '_Ejemplo:_\n' +
    '`LK Econo Chlor | 251636 | 29/08/2026 | 6% | N`\n' +
    '`Alumi Clean | 249791 | 31/07/2026 | 3% | N`\n\n' +
    '_Cuando termines, haz clic en "Generar Reporte"._',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('📤 Generar Reporte', 'elegir_formato')],
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ]) }
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
    delete userSessions[userId];

    await ctx.reply(
      '✅ *¡Reporte generado exitosamente!*\n\n' +
      '¿Deseas crear otro?',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
        [Markup.button.callback('❌ Salir', 'cancelar')]
      ]) }
    );
  } catch (error) {
    console.error('Error generando reporte:', error);
    ctx.answerCbQuery('❌ Error al generar el PDF. Intenta nuevamente.', true);
  }
});

bot.action('elegir_formato', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (!session || session.step !== 'insumos') {
    return ctx.answerCbQuery('Por favor completa los datos del reporte primero.', true);
  }
  if (!session.data.cliente || !session.data.reportNum) {
    return ctx.answerCbQuery('❌ Faltan datos obligatorios.', true);
  }

  const count = session.insumos ? session.insumos.length : 0;
  ctx.editMessageText(
    `✅ *${count} insumo${count !== 1 ? 's' : ''} registrado${count !== 1 ? 's' : ''}.*\n\n` +
    '📤 *¿En qué formato quieres el reporte?*',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('📄 PDF', 'generar_pdf'), Markup.button.callback('📝 Word (.docx)', 'generar_word')],
      [Markup.button.callback('📄+📝 Ambos', 'generar_ambos')],
      [Markup.button.callback('❌ Cancelar', 'cancelar')],
    ]) }
  );
});

bot.action('generar_word', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (!session || session.step !== 'insumos') {
    return ctx.answerCbQuery('Por favor completa los datos del reporte primero.', true);
  }
  if (!session.data.cliente || !session.data.reportNum) {
    return ctx.answerCbQuery('❌ Faltan datos obligatorios.', true);
  }

  try {
    await ctx.answerCbQuery('⏳ Generando Word...');
    const docBuffer = await buildDOCX(session.data);
    const docFilename = `reporte-${session.data.reportNum}.docx`;

    await ctx.replyWithDocument(
      { source: docBuffer, filename: docFilename },
      { caption: `📝 Reporte #${session.data.reportNum} — ${session.data.cliente}`, parse_mode: 'Markdown' }
    );

    delete userSessions[userId];
    await ctx.reply(
      '✅ *¡Reporte Word generado exitosamente!*\n\n¿Deseas crear otro?',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
        [Markup.button.callback('❌ Salir', 'cancelar')]
      ]) }
    );
  } catch (error) {
    console.error('Error generando Word:', error);
    ctx.answerCbQuery('❌ Error al generar el Word. Intenta nuevamente.', true);
  }
});

bot.action('generar_ambos', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (!session || session.step !== 'insumos') {
    return ctx.answerCbQuery('Por favor completa los datos del reporte primero.', true);
  }
  if (!session.data.cliente || !session.data.reportNum) {
    return ctx.answerCbQuery('❌ Faltan datos obligatorios.', true);
  }

  try {
    await ctx.answerCbQuery('⏳ Generando PDF y Word...');

    const htmlContent = buildHTML(session.data);
    const pdfFilename = `reporte-${session.data.reportNum}-${Date.now()}.pdf`;
    const pdfPath = await htmlToPdf(htmlContent, pdfFilename);
    const docBuffer = await buildDOCX(session.data);
    const docFilename = `reporte-${session.data.reportNum}.docx`;

    await ctx.replyWithDocument(
      { source: pdfPath },
      { caption: `📄 Reporte #${session.data.reportNum} — ${session.data.cliente} (PDF)`, parse_mode: 'Markdown' }
    );
    fs.unlink(pdfPath, () => {});

    await ctx.replyWithDocument(
      { source: docBuffer, filename: docFilename },
      { caption: `📝 Reporte #${session.data.reportNum} — ${session.data.cliente} (Word)`, parse_mode: 'Markdown' }
    );

    delete userSessions[userId];
    await ctx.reply(
      '✅ *¡Ambos formatos generados!*\n\n¿Deseas crear otro?',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
        [Markup.button.callback('❌ Salir', 'cancelar')]
      ]) }
    );
  } catch (error) {
    console.error('Error generando reportes:', error);
    ctx.answerCbQuery('❌ Error al generar los reportes. Intenta nuevamente.', true);
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
        '_Paso 2 de 12_\n' +
        '¿Tipo de servicio?',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
          [Markup.button.callback('🔧 Correctiva', 'tipo_servicio_correctiva')],
          [Markup.button.callback('📅 Preventiva', 'tipo_servicio_preventiva')],
          [Markup.button.callback('❌ Cancelar', 'cancelar')]
        ]) }
      );
      break;

    case 'reportNum':
      session.data.reportNum = text;
      session.step = 'contacto';
      ctx.reply(
        '*Paso 4 de 12*\n' +
        '¿Contacto en sitio?\n_Ej: Sergio Gómez / Carlos Muñoz_',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'contacto':
      session.data.contacto = text;
      session.step = 'ubicacion';
      ctx.reply(
        '*Paso 5 de 12*\n' +
        '¿Ubicación?\n_Ej: Km 10, retorno 10 vía Las Palmas_',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'ubicacion':
      session.data.ubicacion = text;
      session.step = 'equipo';
      ctx.reply(
        '*Paso 6 de 12*\n' +
        '¿Equipo intervenido?\n_Ej: Parrilla 6 Toneladas_',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'equipo':
      session.data.equipo = text;
      session.step = 'fecha';
      ctx.reply(
        '*Paso 7 de 12*\n' +
        '¿Fecha de ejecución?\n_Ej: 28 de Abril de 2026_',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'fecha':
      session.data.fecha = text;
      session.step = 'horario';
      ctx.reply(
        '*Paso 8 de 12*\n' +
        '¿Horario de intervención?\n_Ej: 23:00 — 04:00_',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'horario':
      session.data.horario = text;
      session.step = 'tecnicos';
      ctx.reply(
        '*Paso 9 de 12*\n' +
        '¿Técnicos participantes?\n_Separados por coma. Ej: Geimer España, Juan Cano_',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'tecnicos':
      session.data.tecnicos = text;
      session.step = 'observaciones';
      ctx.reply(
        '*Paso 10 de 12*\n' +
        '¿Observaciones adicionales?\n_Escribe "—" si no hay._',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'observaciones':
      session.data.observaciones = text;
      session.step = 'fotos';
      session.fotos = { array: [] };
      ctx.reply(
        '📸 *Paso 11 de 12 — Registro fotográfico*\n\n' +
        'Envía entre *6 y 10 fotos* del trabajo realizado.\n\n' +
        'Puedes incluir:\n' +
        '• Fotos ANTES\n' +
        '• Fotos DURANTE\n' +
        '• Fotos DESPUÉS\n\n' +
        '_Cuando termines, haz clic en "Fotos Listo"._',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Fotos Listo', 'fotos_listo')],
          [Markup.button.callback('❌ Cancelar', 'cancelar')]
        ]) }
      );
      break;

    case 'insumos': {
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

        const lista = session.insumos.map((ins, i) => `${i + 1}. ${ins.nombre}`).join('\n');
        ctx.reply(
          `✅ *Insumo agregado:* ${parts[0]}\n\n` +
          `*Insumos registrados (${session.insumos.length}):*\n${lista}\n\n` +
          '_Agrega otro insumo o haz clic en "Generar Reporte"._',
          { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
            [Markup.button.callback('📤 Generar Reporte', 'elegir_formato')],
            [Markup.button.callback('❌ Cancelar', 'cancelar')]
          ]) }
        );
      } else {
        ctx.reply(
          '❌ Formato incorrecto. Usa:\n`Nombre | Lote | Vencimiento | Concentración | S/N`',
          { parse_mode: 'Markdown' }
        );
      }
      break;
    }
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

    if (fotosCount >= 10) {
      ctx.reply(
        '⚠️ Ya alcanzaste el máximo de 10 fotos. Haz clic en "Fotos Listo" para continuar.',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Fotos Listo', 'fotos_listo')],
          [Markup.button.callback('❌ Cancelar', 'cancelar')]
        ]) }
      );
      return;
    }

    const file = await ctx.telegram.getFile(ctx.message.photo[ctx.message.photo.length - 1].file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const b64 = Buffer.from(response.data).toString('base64');
    const fotoB64 = `data:image/jpeg;base64,${b64}`;

    if (!session.fotos.array) session.fotos.array = [];
    session.fotos.array.push(fotoB64);

    const nuevaCount = session.fotos.array.length;
    const faltanMinimo = 6 - nuevaCount;

    let mensaje;
    if (nuevaCount >= 6) {
      mensaje =
        `✅ *Foto ${nuevaCount}/10 guardada.*\n\n` +
        '_Mínimo alcanzado. Puedes continuar o agregar más (hasta 10)._';
    } else {
      mensaje =
        `✅ *Foto ${nuevaCount}/10 guardada.*\n\n` +
        `_Falta${faltanMinimo === 1 ? '' : 'n'} ${faltanMinimo} foto${faltanMinimo === 1 ? '' : 's'} para el mínimo requerido._`;
    }

    if (nuevaCount >= 6) {
      ctx.reply(mensaje, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Fotos Listo', 'fotos_listo')],
        [Markup.button.callback('❌ Cancelar', 'cancelar')]
      ]) });
    } else {
      ctx.reply(mensaje, { parse_mode: 'Markdown' });
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

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
