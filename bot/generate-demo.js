require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { buildHTML } = require('./template');

// Genera una imagen SVG de color sólido como foto de demo
function demoPhoto(label, bg, fg = 'rgba(255,255,255,0.85)') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${bg}" stop-opacity="0.7"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <text x="300" y="180" font-family="Arial,sans-serif" font-size="22" font-weight="bold"
      fill="${fg}" text-anchor="middle" dominant-baseline="middle">${label}</text>
    <text x="300" y="220" font-family="Arial,sans-serif" font-size="14"
      fill="rgba(255,255,255,0.5)" text-anchor="middle">H&amp;Y Mundo Servicios — Demo</text>
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
  observaciones: 'Se encontraron residuos de grasa carbonizada en la zona inferior de la parrilla. ' +
    'Se aplicó doble dosis de detergente alcalino en esa área con tiempo de contacto extendido a 15 min. ' +
    'Estado final: óptimo para operación.',
  insumos: [
    { nombre: 'LK Econo Chlor',       lote: '251636', vencimiento: '29/08/2026', concentracion: '6%',  vencido: false },
    { nombre: 'Alumi Clean',           lote: '249791', vencimiento: '31/07/2026', concentracion: '3%',  vencido: false },
    { nombre: 'Desincrustante Ácido R7', lote: '248902', vencimiento: '15/03/2026', concentracion: '4%', vencido: true },
    { nombre: 'Quat Extra 500',        lote: '252001', vencimiento: '10/12/2026', concentracion: '2%',  vencido: false },
  ],
  fotos: [
    demoPhoto('ANTES — Vista general',   '#4A5568'),
    demoPhoto('ANTES — Zona inferior',   '#2D3748'),
    demoPhoto('DURANTE — Aplicación',    '#0052A3'),
    demoPhoto('DURANTE — Cepillado',     '#0D1B2A'),
    demoPhoto('DESPUÉS — Resultado',     '#145C38'),
    demoPhoto('DESPUÉS — Verificación',  '#1A4731'),
  ],
};

async function main() {
  let browser;
  try {
    console.log('⏳ Generando PDF demo...');

    const html = buildHTML(demoData);

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle2' });

    const outDir = path.join(__dirname, 'pdfs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, 'demo-reporte.pdf');
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();
    console.log(`✅ PDF generado: ${outPath}`);
  } catch (err) {
    console.error('❌ Error:', err);
    if (browser) await browser.close();
    process.exit(1);
  }
}

main();
