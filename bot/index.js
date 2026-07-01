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

// ============ MENÚ PRINCIPAL Y AYUDA ============

function mainMenuMessage(userId) {
  return {
    text:
      '👋 *¡Bienvenido, tienes acceso!*\n' +
      '*H&Y Mundo Servicios — Generador de Reportes*\n\n' +
      `📌 Tu ID de Telegram: \`${userId}\`\n\n` +
      '✅ Genera reportes PDF profesionales en minutos\n' +
      '📸 Registro fotográfico embebido\n' +
      '📋 Trazabilidad de insumos con lotes y vencimientos\n' +
      '✍️ Firmas y certificación\n\n' +
      '¿Qué deseas hacer?',
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
      [Markup.button.callback('❓ Ayuda', 'ayuda_menu')],
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ])
  };
}

const AYUDA_MENU_TEXTO =
  '🆘 *Ayuda — Bot H&Y Generador de Reportes*\n\n' +
  'Selecciona un tema para ver más detalles:';

function ayudaMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 Qué hace / no hace', 'ayuda_que_hace'), Markup.button.callback('🧭 Flujo del reporte', 'ayuda_flujo')],
    [Markup.button.callback('📸 Fotos', 'ayuda_fotos'), Markup.button.callback('🧪 Insumos', 'ayuda_insumos')],
    [Markup.button.callback('📄 Formato de salida', 'ayuda_formato'), Markup.button.callback('📞 Contacto', 'ayuda_contacto')],
    [Markup.button.callback('🏠 Menú principal', 'menu_principal')]
  ]);
}

function ayudaSeccionKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Volver a Ayuda', 'ayuda_menu')],
    [Markup.button.callback('🏠 Menú principal', 'menu_principal')]
  ]);
}

const AYUDA_SECCIONES = {
  que_hace:
    '📋 *¿Qué hace este bot?*\n\n' +
    'Genera reportes técnicos profesionales (PDF y/o Word) de servicios de limpieza y desinfección, con fotos, insumos y firma incluidos.\n\n' +
    '*¿Qué NO hace?*\n' +
    'No corrige ni valida datos técnicos, no guarda historial permanente (si el bot se reinicia, un reporte a medias se pierde) y no reemplaza la firma física en el punto de servicio.',
  flujo:
    '🧭 *Flujo del reporte (12 pasos)*\n\n' +
    'Cliente → Tipo de servicio → N° de reporte → Contacto → Ubicación → Equipo → Fecha → Horario → Técnicos → Observaciones → Fotos → Insumos\n\n' +
    'Toca "📋 Nuevo Reporte" en el menú principal para comenzar.',
  fotos:
    '📸 *Sobre las fotos*\n\n' +
    'Se piden entre *6 y 20 fotos* del trabajo (antes/durante/después). Haz clic en "Fotos Listo" cuando termines.',
  insumos:
    '🧪 *Sobre los insumos*\n\n' +
    'Se agregan uno por uno con un asistente: nombre, lote, vencimiento, concentración y si está vencido (con botones Sí/No).\n\n' +
    'Si ya usaste un producto antes, el bot te lo ofrece como botón para no volver a escribirlo. Puedes editar cualquier insumo (incluyendo el vencimiento) desde el resumen final.',
  formato:
    '📄 *Formato de salida*\n\n' +
    'Al finalizar puedes elegir generar el reporte en PDF, Word, o ambos.',
  contacto:
    '📞 *¿Problemas o dudas adicionales?*\n\n' +
    '📞 +57 300 151 6187\n' +
    '📧 inocuarldtotal@gmail.com',
};

// ============ RESUMEN, EDICIÓN Y REUTILIZACIÓN DE DATOS ============

const lastUsedData = {};
const lastGeneratedDocs = {};

function guardarUltimosDatos(userId, data) {
  lastUsedData[userId] = {
    cliente: data.cliente,
    contacto: data.contacto,
    ubicacion: data.ubicacion,
    equipo: data.equipo,
    tecnicos: data.tecnicos,
  };
}

function buildResumenTexto(session) {
  const d = session.data;
  const fotosCount = (d.fotos && d.fotos.length) || 0;
  const insumosCount = (session.insumos && session.insumos.length) || 0;
  return (
    '📝 *Resumen del reporte*\n\n' +
    `*Cliente:* ${d.cliente || '—'}\n` +
    `*Tipo de servicio:* ${d.tipoServicio || '—'}\n` +
    `*N° Reporte:* ${d.reportNum || '—'}\n` +
    `*Contacto:* ${d.contacto || '—'}\n` +
    `*Ubicación:* ${d.ubicacion || '—'}\n` +
    `*Equipo:* ${d.equipo || '—'}\n` +
    `*Fecha:* ${d.fecha || '—'}\n` +
    `*Horario:* ${d.horario || '—'}\n` +
    `*Técnicos:* ${d.tecnicos || '—'}\n` +
    `*Observaciones:* ${d.observaciones || '—'}\n` +
    `*Fotos:* ${fotosCount}\n` +
    `*Insumos:* ${insumosCount}\n\n` +
    '¿Todo correcto?'
  );
}

function resumenKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✏️ Editar datos', 'editar_datos_menu')],
    [Markup.button.callback('📸 Rehacer fotos', 'rehacer_fotos'), Markup.button.callback('🧪 Rehacer insumos', 'rehacer_insumos')],
    [Markup.button.callback('✅ Confirmar y Generar', 'elegir_formato')],
    [Markup.button.callback('❌ Cancelar', 'cancelar')]
  ]);
}

const CAMPOS_EDITABLES = {
  cliente: 'Cliente',
  tipoServicio: 'Tipo de servicio',
  reportNum: 'N° de Reporte',
  contacto: 'Contacto',
  ubicacion: 'Ubicación',
  equipo: 'Equipo',
  fecha: 'Fecha',
  horario: 'Horario',
  tecnicos: 'Técnicos',
  observaciones: 'Observaciones',
};

function editarDatosKeyboard() {
  const entries = Object.entries(CAMPOS_EDITABLES);
  const rows = [];
  for (let i = 0; i < entries.length; i += 2) {
    const row = [Markup.button.callback(entries[i][1], `editar_campo_${entries[i][0]}`)];
    if (entries[i + 1]) row.push(Markup.button.callback(entries[i + 1][1], `editar_campo_${entries[i + 1][0]}`));
    rows.push(row);
  }
  rows.push([Markup.button.callback('⬅️ Volver al resumen', 'ver_resumen')]);
  return Markup.inlineKeyboard(rows);
}

function pedirCliente(ctx) {
  ctx.editMessageText(
    '📝 *Nuevo Reporte* — _Paso 1 de 12_\n\n' +
    '¿Cuál es el nombre del cliente?\n' +
    '_Ej: Cocorollo Palmas S.A.S_',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ]) }
  );
}

// ============ ASISTENTE DE INSUMOS ============

const productosFrecuentes = {};

function registrarProductoFrecuente(userId, insumo) {
  const lista = (productosFrecuentes[userId] || []).filter(
    (p) => p.nombre.toLowerCase() !== insumo.nombre.toLowerCase()
  );
  lista.unshift({ nombre: insumo.nombre, concentracion: insumo.concentracion });
  productosFrecuentes[userId] = lista.slice(0, 6);
}

function productoFrecuenteKeyboard(frecuentes) {
  const rows = frecuentes.map((p, i) => [Markup.button.callback(p.nombre, `insumo_producto_${i}`)]);
  rows.push([Markup.button.callback('🆕 Otro producto', 'insumo_producto_nuevo')]);
  rows.push([Markup.button.callback('❌ Cancelar', 'cancelar')]);
  return Markup.inlineKeyboard(rows);
}

function iniciarAsistenteInsumo(ctx, userId, session, encabezado) {
  session.insumoWizard = { paso: 'nombre', datos: {} };
  const frecuentes = productosFrecuentes[userId] || [];
  const texto = encabezado
    ? `${encabezado}\n\n🧪 *¿Qué insumo vas a agregar?*\n\nElige uno usado antes o agrega uno nuevo:`
    : '🧪 *¿Qué insumo vas a agregar?*\n\nElige uno usado antes o agrega uno nuevo:';

  if (frecuentes.length) {
    ctx.editMessageText(texto, { parse_mode: 'Markdown', ...productoFrecuenteKeyboard(frecuentes) });
  } else {
    ctx.editMessageText(
      (encabezado ? `${encabezado}\n\n` : '') +
      '🧪 *Insumo — Nombre*\n\n¿Cuál es el nombre del insumo?\n_Ej: LK Econo Chlor_',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancelar')]]) }
    );
  }
}

function preguntarVencido(ctx, wiz) {
  wiz.paso = 'vencido';
  ctx.reply(
    `🧪 *Insumo:* ${wiz.datos.nombre}\n` +
    `*Lote:* ${wiz.datos.lote}\n` +
    `*Vencimiento:* ${wiz.datos.vencimiento}\n` +
    `*Concentración:* ${wiz.datos.concentracion}\n\n` +
    '¿Está vencido?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ No', 'insumo_vencido_no'), Markup.button.callback('⚠️ Sí', 'insumo_vencido_si')],
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ]) }
  );
}

function buildInsumosResumenTexto(session) {
  const lista = session.insumos
    .map((ins, i) => `${i + 1}. *${ins.nombre}* — Lote ${ins.lote}, vence ${ins.vencimiento}${ins.vencido ? ' ⚠️ VENCIDO' : ''}`)
    .join('\n');
  return `✅ *Insumos registrados (${session.insumos.length}):*\n${lista}\n\n¿Qué deseas hacer?`;
}

function insumosResumenKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➕ Agregar otro insumo', 'agregar_insumo')],
    [Markup.button.callback('✏️ Editar un insumo', 'editar_insumo_menu')],
    [Markup.button.callback('📝 Ver Resumen', 'ver_resumen')],
    [Markup.button.callback('❌ Cancelar', 'cancelar')]
  ]);
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
      '📞 +57 300 151 6187\n' +
      '📧 inocuarldtotal@gmail.com',
      { parse_mode: 'Markdown' }
    );
  }

  const { text, keyboard } = mainMenuMessage(userId);
  ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
});

bot.command('cancelar', (ctx) => {
  const userId = ctx.from.id;
  delete userSessions[userId];
  ctx.reply('❌ Reporte cancelado. Usa /start para comenzar de nuevo.');
});

bot.command('ayuda', (ctx) => {
  ctx.reply(AYUDA_MENU_TEXTO, { parse_mode: 'Markdown', ...ayudaMenuKeyboard() });
});

// ============ ACCIONES CON BOTONES ============

bot.action('menu_principal', (ctx) => {
  const userId = ctx.from.id;
  const { text, keyboard } = mainMenuMessage(userId);
  ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
});

bot.action('ayuda_menu', (ctx) => {
  ctx.editMessageText(AYUDA_MENU_TEXTO, { parse_mode: 'Markdown', ...ayudaMenuKeyboard() });
});

bot.action(/^ayuda_(que_hace|flujo|fotos|insumos|formato|contacto)$/, (ctx) => {
  const seccion = AYUDA_SECCIONES[ctx.match[1]];
  ctx.editMessageText(seccion, { parse_mode: 'Markdown', ...ayudaSeccionKeyboard() });
});

bot.action('nuevo_reporte', (ctx) => {
  const userId = ctx.from.id;
  if (!isAllowed(userId)) return ctx.answerCbQuery('Sin acceso autorizado.', true);
  userSessions[userId] = {
    step: 'cliente',
    data: {}
  };

  const ultimo = lastUsedData[userId];
  if (ultimo) {
    ctx.editMessageText(
      '📝 *Nuevo Reporte*\n\n' +
      '¿Es para el mismo cliente del último reporte?\n\n' +
      `*Cliente:* ${ultimo.cliente}\n*Ubicación:* ${ultimo.ubicacion}\n*Equipo:* ${ultimo.equipo}`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('♻️ Sí, usar los mismos datos', 'usar_mismos_datos')],
        [Markup.button.callback('🆕 No, es diferente', 'datos_nuevos')],
        [Markup.button.callback('❌ Cancelar', 'cancelar')]
      ]) }
    );
    return;
  }

  pedirCliente(ctx);
});

bot.action('datos_nuevos', (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { step: 'cliente', data: {} };
  pedirCliente(ctx);
});

bot.action('usar_mismos_datos', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  const ultimo = lastUsedData[userId];
  if (!session || !ultimo) return ctx.answerCbQuery('No hay datos previos disponibles.', true);

  session.data = { ...ultimo };
  session.reusarDatos = true;
  session.step = 'tipoServicio';

  ctx.editMessageText(
    `✅ Cliente: *${session.data.cliente}*\n` +
    '_Contacto, ubicación, equipo y técnicos reutilizados del último reporte._\n\n' +
    '_Paso 2 de 12_\n¿Tipo de servicio?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('🔧 Correctiva', 'tipo_servicio_correctiva'), Markup.button.callback('📅 Preventiva', 'tipo_servicio_preventiva')],
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ]) }
  );
});

bot.action('cancelar', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(
    '⚠️ *¿Seguro que deseas cancelar?*\nPerderás todo lo capturado en este reporte.',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ Sí, cancelar', 'cancelar_confirmado'), Markup.button.callback('◀️ No, continuar', 'cancelar_abortar')]
    ]) }
  );
});

bot.action('cancelar_confirmado', (ctx) => {
  const userId = ctx.from.id;
  delete userSessions[userId];
  ctx.editMessageText('❌ Reporte cancelado. Usa /start para comenzar de nuevo.');
});

bot.action('cancelar_abortar', (ctx) => {
  ctx.editMessageText('👍 Reporte activo, continúa donde estabas.');
});

bot.action(/^tipo_servicio_(.+)$/, (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  const tipo = ctx.match[1];

  session.data.tipoServicio = tipo === 'correctiva' ? 'Limpieza Correctiva' : 'Limpieza Preventiva';

  if (session.editing === 'tipoServicio') {
    session.editing = null;
    ctx.editMessageText(buildResumenTexto(session), { parse_mode: 'Markdown', ...resumenKeyboard() });
    return;
  }

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

  if (session.volverAResumen) {
    session.volverAResumen = false;
    ctx.editMessageText(buildResumenTexto(session), { parse_mode: 'Markdown', ...resumenKeyboard() });
    return;
  }

  iniciarAsistenteInsumo(ctx, userId, session, `✅ *${fotosCount} fotos guardadas.*\n\n_Paso 12 de 12_`);
});

bot.action('ver_resumen', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session || session.step !== 'insumos') {
    return ctx.answerCbQuery('Por favor completa los datos del reporte primero.', true);
  }
  ctx.editMessageText(buildResumenTexto(session), { parse_mode: 'Markdown', ...resumenKeyboard() });
});

bot.action('editar_datos_menu', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session) return ctx.answerCbQuery('Sesión no encontrada. Usa /start.', true);
  ctx.editMessageText('✏️ *¿Qué dato quieres corregir?*', { parse_mode: 'Markdown', ...editarDatosKeyboard() });
});

bot.action(/^editar_campo_(cliente|tipoServicio|reportNum|contacto|ubicacion|equipo|fecha|horario|tecnicos|observaciones)$/, (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  const campo = ctx.match[1];
  if (!session) return ctx.answerCbQuery('Sesión no encontrada. Usa /start.', true);

  if (campo === 'tipoServicio') {
    session.editing = 'tipoServicio';
    ctx.editMessageText(
      `✏️ *Tipo de servicio actual:* ${session.data.tipoServicio || '—'}\n\n¿Cuál es el nuevo tipo?`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('🔧 Correctiva', 'tipo_servicio_correctiva'), Markup.button.callback('📅 Preventiva', 'tipo_servicio_preventiva')],
        [Markup.button.callback('⬅️ Cancelar edición', 'editar_datos_menu')]
      ]) }
    );
    return;
  }

  session.editing = campo;
  ctx.editMessageText(
    `✏️ *${CAMPOS_EDITABLES[campo]} actual:* ${session.data[campo] || '—'}\n\nEscribe el nuevo valor:`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Cancelar edición', 'editar_datos_menu')]
    ]) }
  );
});

bot.action('rehacer_fotos', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session || session.step !== 'insumos') return ctx.answerCbQuery('Sesión no válida.', true);

  session.fotos = { array: [] };
  session.step = 'fotos';
  session.volverAResumen = true;

  ctx.editMessageText(
    '📸 *Rehaciendo el registro fotográfico*\n\n' +
    'Envía entre *6 y 20 fotos* nuevas del trabajo realizado.\n\n' +
    '_Cuando termines, haz clic en "Fotos Listo"._',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ Fotos Listo', 'fotos_listo')],
      [Markup.button.callback('❌ Cancelar', 'cancelar')]
    ]) }
  );
});

bot.action('rehacer_insumos', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session || session.step !== 'insumos') return ctx.answerCbQuery('Sesión no válida.', true);

  session.insumos = [];
  session.data.insumos = [];

  iniciarAsistenteInsumo(ctx, userId, session, '🧪 *Rehaciendo insumos*');
});

bot.action('agregar_insumo', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session || session.step !== 'insumos') return ctx.answerCbQuery('Sesión no válida.', true);

  iniciarAsistenteInsumo(ctx, userId, session);
});

bot.action(/^insumo_producto_(\d+|nuevo)$/, (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session || !session.insumoWizard) return ctx.answerCbQuery('Sesión no válida.', true);
  const valor = ctx.match[1];

  if (valor === 'nuevo') {
    ctx.editMessageText(
      '🧪 *Insumo — Nombre*\n\n¿Cuál es el nombre del insumo?\n_Ej: LK Econo Chlor_',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancelar')]]) }
    );
    return;
  }

  const producto = (productosFrecuentes[userId] || [])[Number(valor)];
  if (!producto) return ctx.answerCbQuery('Producto no encontrado.', true);

  session.insumoWizard.datos.nombre = producto.nombre;
  session.insumoWizard.datos.concentracion = producto.concentracion;
  session.insumoWizard.paso = 'lote';

  ctx.editMessageText(
    `✅ Producto: *${producto.nombre}* (${producto.concentracion})\n\n` +
    '🧪 *Insumo — Lote*\n\n¿Cuál es el número de lote?\n_Ej: 251636_',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancelar')]]) }
  );
});

bot.action(/^insumo_vencido_(si|no)$/, (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session || !session.insumoWizard) return ctx.answerCbQuery('Sesión no válida.', true);

  const insumo = { ...session.insumoWizard.datos, vencido: ctx.match[1] === 'si' };
  if (!session.insumos) session.insumos = [];
  session.insumos.push(insumo);
  session.data.insumos = session.insumos;
  registrarProductoFrecuente(userId, insumo);
  session.insumoWizard = null;

  ctx.editMessageText(buildInsumosResumenTexto(session), { parse_mode: 'Markdown', ...insumosResumenKeyboard() });
});

bot.action('ver_insumos', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session || !session.insumos) return ctx.answerCbQuery('Sesión no válida.', true);
  ctx.editMessageText(buildInsumosResumenTexto(session), { parse_mode: 'Markdown', ...insumosResumenKeyboard() });
});

bot.action('editar_insumo_menu', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session || !session.insumos || !session.insumos.length) {
    return ctx.answerCbQuery('No hay insumos para editar.', true);
  }

  const rows = session.insumos.map((ins, i) => [Markup.button.callback(`${i + 1}. ${ins.nombre}`, `editar_insumo_${i}`)]);
  rows.push([Markup.button.callback('⬅️ Volver', 'ver_insumos')]);
  ctx.editMessageText('✏️ *¿Cuál insumo quieres corregir?*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) });
});

bot.action(/^editar_insumo_(\d+)$/, (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  const index = Number(ctx.match[1]);
  const insumo = session && session.insumos && session.insumos[index];
  if (!insumo) return ctx.answerCbQuery('Insumo no encontrado.', true);

  ctx.editMessageText(
    `✏️ *Editando:* ${insumo.nombre}\n\n` +
    `Lote: ${insumo.lote}\nVencimiento: ${insumo.vencimiento}\nConcentración: ${insumo.concentracion}\nVencido: ${insumo.vencido ? 'Sí' : 'No'}\n\n` +
    '¿Qué campo quieres corregir?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('Nombre', `editar_campo_insumo_${index}_nombre`), Markup.button.callback('Lote', `editar_campo_insumo_${index}_lote`)],
      [Markup.button.callback('Vencimiento', `editar_campo_insumo_${index}_vencimiento`), Markup.button.callback('Concentración', `editar_campo_insumo_${index}_concentracion`)],
      [Markup.button.callback('Vencido: cambiar', `editar_campo_insumo_${index}_vencido`)],
      [Markup.button.callback('⬅️ Volver', 'editar_insumo_menu')]
    ]) }
  );
});

bot.action(/^editar_campo_insumo_(\d+)_(nombre|lote|vencimiento|concentracion)$/, (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  const index = Number(ctx.match[1]);
  const campo = ctx.match[2];
  const insumo = session && session.insumos && session.insumos[index];
  if (!insumo) return ctx.answerCbQuery('Insumo no encontrado.', true);

  session.editingInsumo = { index, campo };
  const etiquetas = { nombre: 'Nombre', lote: 'Lote', vencimiento: 'Vencimiento', concentracion: 'Concentración' };
  ctx.editMessageText(
    `✏️ *${etiquetas[campo]} actual:* ${insumo[campo]}\n\nEscribe el nuevo valor:`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Cancelar edición', `editar_insumo_${index}`)]]) }
  );
});

bot.action(/^editar_campo_insumo_(\d+)_vencido$/, (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  const index = Number(ctx.match[1]);
  const insumo = session && session.insumos && session.insumos[index];
  if (!insumo) return ctx.answerCbQuery('Insumo no encontrado.', true);

  ctx.editMessageText(
    `✏️ *¿${insumo.nombre} está vencido?*`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ No', `set_insumo_vencido_${index}_no`), Markup.button.callback('⚠️ Sí', `set_insumo_vencido_${index}_si`)]
    ]) }
  );
});

bot.action(/^set_insumo_vencido_(\d+)_(si|no)$/, (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  const index = Number(ctx.match[1]);
  const insumo = session && session.insumos && session.insumos[index];
  if (!insumo) return ctx.answerCbQuery('Insumo no encontrado.', true);

  insumo.vencido = ctx.match[2] === 'si';
  ctx.editMessageText(buildInsumosResumenTexto(session), { parse_mode: 'Markdown', ...insumosResumenKeyboard() });
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
    await ctx.sendChatAction('upload_document');

    const htmlContent = buildHTML(session.data);
    const filename = `reporte-${session.data.reportNum}-${Date.now()}.pdf`;
    const pdfPath = await htmlToPdf(htmlContent, filename);
    const pdfBuffer = fs.readFileSync(pdfPath);
    fs.unlink(pdfPath, () => {});
    const pdfFilename = `reporte-${session.data.reportNum}.pdf`;

    await ctx.replyWithDocument(
      { source: pdfBuffer, filename: pdfFilename },
      {
        caption: `📄 Reporte #${session.data.reportNum} — ${session.data.cliente}`,
        parse_mode: 'Markdown'
      }
    );

    lastGeneratedDocs[userId] = { pdfBuffer, pdfFilename, cliente: session.data.cliente, reportNum: session.data.reportNum };
    guardarUltimosDatos(userId, session.data);
    delete userSessions[userId];

    await ctx.reply(
      '✅ *¡Reporte generado exitosamente!*\n\n' +
      '¿Deseas crear otro?',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
        [Markup.button.callback('🔁 Reenviar', 'reenviar_ultimo')],
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
    await ctx.sendChatAction('upload_document');
    const docBuffer = await buildDOCX(session.data);
    const docFilename = `reporte-${session.data.reportNum}.docx`;

    await ctx.replyWithDocument(
      { source: docBuffer, filename: docFilename },
      { caption: `📝 Reporte #${session.data.reportNum} — ${session.data.cliente}`, parse_mode: 'Markdown' }
    );

    lastGeneratedDocs[userId] = { docBuffer, docFilename, cliente: session.data.cliente, reportNum: session.data.reportNum };
    guardarUltimosDatos(userId, session.data);
    delete userSessions[userId];
    await ctx.reply(
      '✅ *¡Reporte Word generado exitosamente!*\n\n¿Deseas crear otro?',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
        [Markup.button.callback('🔁 Reenviar', 'reenviar_ultimo')],
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
    await ctx.sendChatAction('upload_document');

    const htmlContent = buildHTML(session.data);
    const pdfFilename = `reporte-${session.data.reportNum}-${Date.now()}.pdf`;
    const pdfPath = await htmlToPdf(htmlContent, pdfFilename);
    const pdfBuffer = fs.readFileSync(pdfPath);
    fs.unlink(pdfPath, () => {});
    const docBuffer = await buildDOCX(session.data);
    const docFilename = `reporte-${session.data.reportNum}.docx`;

    await ctx.replyWithDocument(
      { source: pdfBuffer, filename: `reporte-${session.data.reportNum}.pdf` },
      { caption: `📄 Reporte #${session.data.reportNum} — ${session.data.cliente} (PDF)`, parse_mode: 'Markdown' }
    );

    await ctx.replyWithDocument(
      { source: docBuffer, filename: docFilename },
      { caption: `📝 Reporte #${session.data.reportNum} — ${session.data.cliente} (Word)`, parse_mode: 'Markdown' }
    );

    lastGeneratedDocs[userId] = {
      pdfBuffer, pdfFilename: `reporte-${session.data.reportNum}.pdf`,
      docBuffer, docFilename,
      cliente: session.data.cliente, reportNum: session.data.reportNum
    };
    guardarUltimosDatos(userId, session.data);
    delete userSessions[userId];
    await ctx.reply(
      '✅ *¡Ambos formatos generados!*\n\n¿Deseas crear otro?',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Nuevo Reporte', 'nuevo_reporte')],
        [Markup.button.callback('🔁 Reenviar', 'reenviar_ultimo')],
        [Markup.button.callback('❌ Salir', 'cancelar')]
      ]) }
    );
  } catch (error) {
    console.error('Error generando reportes:', error);
    ctx.answerCbQuery('❌ Error al generar los reportes. Intenta nuevamente.', true);
  }
});

bot.action('reenviar_ultimo', async (ctx) => {
  const userId = ctx.from.id;
  const doc = lastGeneratedDocs[userId];
  if (!doc) {
    return ctx.answerCbQuery('No hay ningún reporte reciente para reenviar.', true);
  }

  await ctx.answerCbQuery('📤 Reenviando...');
  if (doc.pdfBuffer) {
    await ctx.replyWithDocument(
      { source: doc.pdfBuffer, filename: doc.pdfFilename },
      { caption: `📄 Reporte #${doc.reportNum} — ${doc.cliente}`, parse_mode: 'Markdown' }
    );
  }
  if (doc.docBuffer) {
    await ctx.replyWithDocument(
      { source: doc.docBuffer, filename: doc.docFilename },
      { caption: `📝 Reporte #${doc.reportNum} — ${doc.cliente}`, parse_mode: 'Markdown' }
    );
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

  if (session.editingInsumo) {
    const { index, campo } = session.editingInsumo;
    if (session.insumos && session.insumos[index]) {
      session.insumos[index][campo] = text;
      session.data.insumos = session.insumos;
    }
    session.editingInsumo = null;
    ctx.reply(buildInsumosResumenTexto(session), { parse_mode: 'Markdown', ...insumosResumenKeyboard() });
    return;
  }

  if (session.insumoWizard) {
    const wiz = session.insumoWizard;

    if (wiz.paso === 'nombre') {
      wiz.datos.nombre = text;
      wiz.paso = 'lote';
      ctx.reply(
        '🧪 *Insumo — Lote*\n\n¿Cuál es el número de lote?\n_Ej: 251636_',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancelar')]]) }
      );
      return;
    }

    if (wiz.paso === 'lote') {
      wiz.datos.lote = text;
      wiz.paso = 'vencimiento';
      ctx.reply(
        '🧪 *Insumo — Vencimiento*\n\n¿Fecha de vencimiento?\n_Ej: 29/08/2026_',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancelar')]]) }
      );
      return;
    }

    if (wiz.paso === 'vencimiento') {
      wiz.datos.vencimiento = text;
      if (wiz.datos.concentracion) {
        preguntarVencido(ctx, wiz);
        return;
      }
      wiz.paso = 'concentracion';
      ctx.reply(
        '🧪 *Insumo — Concentración*\n\n¿Cuál es la concentración?\n_Ej: 6%_',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancelar')]]) }
      );
      return;
    }

    if (wiz.paso === 'concentracion') {
      wiz.datos.concentracion = text;
      preguntarVencido(ctx, wiz);
      return;
    }
  }

  if (session.editing) {
    session.data[session.editing] = text;
    session.editing = null;
    ctx.reply(buildResumenTexto(session), { parse_mode: 'Markdown', ...resumenKeyboard() });
    return;
  }

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
      if (session.reusarDatos) {
        session.step = 'fecha';
        ctx.reply(
          `✅ N° Reporte: *${text}*\n` +
          `_Contacto: ${session.data.contacto} · Ubicación: ${session.data.ubicacion} · Equipo: ${session.data.equipo}_\n\n` +
          '*Paso 7 de 12*\n¿Fecha de ejecución?\n_Ej: 28 de Abril de 2026_',
          { parse_mode: 'Markdown' }
        );
      } else {
        session.step = 'contacto';
        ctx.reply(
          '*Paso 4 de 12*\n' +
          '¿Contacto en sitio?\n_Ej: Sergio Gómez / Carlos Muñoz_',
          { parse_mode: 'Markdown' }
        );
      }
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
      if (session.reusarDatos) {
        session.step = 'observaciones';
        ctx.reply(
          `✅ Horario: *${text}*\n` +
          `_Técnicos: ${session.data.tecnicos}_\n\n` +
          '*Paso 10 de 12*\n¿Observaciones adicionales?\n_Escribe "—" si no hay._',
          { parse_mode: 'Markdown' }
        );
      } else {
        session.step = 'tecnicos';
        ctx.reply(
          '*Paso 9 de 12*\n' +
          '¿Técnicos participantes?\n_Separados por coma. Ej: Geimer España, Juan Cano_',
          { parse_mode: 'Markdown' }
        );
      }
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
        'Envía entre *6 y 20 fotos* del trabajo realizado.\n\n' +
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

    case 'insumos':
      ctx.reply(
        'Usa los botones del mensaje anterior para continuar.',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('📝 Ver Resumen', 'ver_resumen')]]) }
      );
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

    if (fotosCount >= 20) {
      ctx.reply(
        '⚠️ Ya alcanzaste el máximo de 20 fotos. Haz clic en "Fotos Listo" para continuar.',
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
        `✅ *Foto ${nuevaCount}/20 guardada.*\n\n` +
        '_Mínimo alcanzado. Puedes continuar o agregar más (hasta 20)._';
    } else {
      mensaje =
        `✅ *Foto ${nuevaCount}/20 guardada.*\n\n` +
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

bot.telegram.setMyCommands([
  { command: 'start', description: 'Iniciar el bot / nuevo reporte' },
  { command: 'ayuda', description: 'Ver ayuda y alcances del bot' },
  { command: 'cancelar', description: 'Cancelar el reporte en curso' },
]);

bot.launch().then(() => {
  console.log('✅ Bot iniciado. Escuchando mensajes...');
}).catch(err => {
  console.error('❌ Error al iniciar bot:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
