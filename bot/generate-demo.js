require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { buildHTML } = require('./template');

function demoPhoto(label, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="${bg}" stop-opacity="0.65"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <text x="300" y="180" font-family="Arial,sans-serif" font-size="22" font-weight="bold"
      fill="rgba(255,255,255,0.88)" text-anchor="middle">${label}</text>
    <text x="300" y="218" font-family="Arial,sans-serif" font-size="13"
      fill="rgba(255,255,255,0.45)" text-anchor="middle">H&amp;Y Mundo Servicios — Demo</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const demoData = {
  reportNum: '052',
  tipoServicio: 'Limpieza Correctiva',
  cliente: 'Cocorollo Palmas S.A.S',
  contacto: 'Sergio Gómez / Carlos Muñoz',
  ubicacion: 'Km 10, retorno 10 vía Las Palmas — Medellín, Antioquia',
  equipo: 'Parrilla Industrial 6 Toneladas',
  fecha: '28 de Abril de 2026',
  horario: '23:00 — 04:00',
  tecnicos: 'Geimer España, Juan Cano',
  observaciones:
    'Se encontraron residuos de grasa carbonizada en la zona inferior de la parrilla. ' +
    'Se aplicó doble dosis de detergente alcalino con tiempo de contacto extendido a 15 min. ' +
    'Estado final: óptimo para operación.',
  insumos: [
    { nombre: 'LK Econo Chlor',         lote: '251636', vencimiento: '29/08/2026', concentracion: '6%', vencido: false },
    { nombre: 'Alumi Clean',             lote: '249791', vencimiento: '31/07/2026', concentracion: '3%', vencido: false },
    { nombre: 'Desincrustante Ácido R7', lote: '248902', vencimiento: '15/03/2026', concentracion: '4%', vencido: true  },
    { nombre: 'Quat Extra 500',          lote: '252001', vencimiento: '10/12/2026', concentracion: '2%', vencido: false },
  ],
  fotos: [
    demoPhoto('ANTES — Vista general',  '#4A5568'),
    demoPhoto('ANTES — Zona inferior',  '#2D3748'),
    demoPhoto('DURANTE — Aplicación',   '#0052A3'),
    demoPhoto('DURANTE — Cepillado',    '#0D1B2A'),
    demoPhoto('DESPUÉS — Resultado',    '#145C38'),
    demoPhoto('DESPUÉS — Verificación', '#1A4731'),
  ],
};

// Inyecta variables CSS al final del <style> para sobreescribir el tema base
function applyTheme(html, vars) {
  const overrides = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  return html.replace('</style>', `:root{${overrides}}</style>`);
}

// ─── TEMAS ───────────────────────────────────────────────────────────────────
const THEMES = [
  {
    file: 'demo-v1-azul-marino.pdf',
    label: 'V1 — Azul Marino (actual)',
    vars: {},  // sin cambios — tema base
  },
  {
    file: 'demo-v2-azul-vivo.pdf',
    label: 'V2 — Azul Vivo + Dorado',
    vars: {
      '--navy':      '#1B3F6B',   // azul más luminoso, no tan negro
      '--blue':      '#2563EB',   // azul royal vivo
      '--blue-light':'#DBEAFE',
    },
  },
  {
    file: 'demo-v3-teal-aguamarina.pdf',
    label: 'V3 — Teal / Aguamarina',
    vars: {
      '--navy':      '#164E63',   // azul petróleo oscuro
      '--blue':      '#0891B2',   // teal/cyan
      '--blue-light':'#CFFAFE',
      '--green':     '#059669',
      '--green-bg':  '#D1FAE5',
    },
  },
];

async function generatePDF(browser, html, outPath) {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle2' });
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await page.close();
}

async function main() {
  let browser;
  try {
    const outDir = path.join(__dirname, 'pdfs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const baseHtml = buildHTML(demoData);

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const theme of THEMES) {
      const html = applyTheme(baseHtml, theme.vars);
      const outPath = path.join(outDir, theme.file);
      process.stdout.write(`⏳ ${theme.label}...`);
      await generatePDF(browser, html, outPath);
      console.log(` ✅`);
    }

    await browser.close();
    console.log('\n🎉 PDFs en bot/pdfs/');
    THEMES.forEach(t => console.log(`   → ${t.file}`));
  } catch (err) {
    console.error('❌ Error:', err);
    if (browser) await browser.close();
    process.exit(1);
  }
}

main();
