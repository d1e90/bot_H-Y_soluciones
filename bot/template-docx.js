'use strict';
const path = require('path');
const fs   = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} = require('docx');

const LOGO_PATH  = path.resolve(__dirname, 'H&Y_LOGO_2.png');
const FIRMA_PATH = path.resolve(__dirname, 'FIRMA 2.png');

// Paleta (sin #)
const N  = '0D1B2A'; // navy
const B  = '0052A3'; // blue
const BL = 'E8F1FC'; // blue-light
const G  = 'C9A84C'; // gold
const GR = '145C38'; // green
const G1 = 'F8F9FC'; // gray-1
const G2 = 'E4E9F2'; // gray-2
const G4 = '6B7789'; // gray-4
const WH = 'FFFFFF';

const NB = {
  top:              { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom:           { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left:             { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right:            { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideVertical:   { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function r(text, opts = {}) {
  return new TextRun({ text: String(text), font: 'Calibri', ...opts });
}

function p(children, opts = {}) {
  const runs = Array.isArray(children)
    ? children
    : [typeof children === 'string' ? r(children) : children];
  return new Paragraph({ children: runs, ...opts });
}

function tbl(rows, opts = {}) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NB, rows, ...opts });
}

function shCell(fill, children, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    borders: NB,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill },
    ...opts,
  });
}

function goldDivider() {
  return p([], {
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: G } },
    spacing: { before: 0, after: 120 },
  });
}

function sectionHeader(num, title, badge) {
  const badgeCell = badge
    ? [shCell(BL, [
        p([r(badge, { color: B, bold: true, size: 16 })], {
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
        }),
      ], { width: { size: 20, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER })]
    : [];

  return tbl([
    new TableRow({ children: [
      shCell(N, [
        p([r(String(num), { color: WH, bold: true, size: 20 })], {
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
        }),
      ], { width: { size: 5, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),
      new TableCell({
        width: { size: badge ? 75 : 95, type: WidthType.PERCENTAGE },
        children: [
          p([r(title.toUpperCase(), { color: N, bold: true, size: 22 })], {
            spacing: { before: 60, after: 60 },
          }),
        ],
        borders: NB,
      }),
      ...badgeCell,
    ]}),
  ]);
}

function infoCell(label, value, highlight = false) {
  return shCell(G1, [
    p([r(label.toUpperCase(), { color: B, bold: true, size: 16 })], {
      spacing: { before: 60, after: 30 },
    }),
    p([r(String(value), { color: highlight ? B : N, bold: true, size: 22 })], {
      spacing: { before: 0, after: 60 },
    }),
  ], { width: { size: 50, type: WidthType.PERCENTAGE } });
}

// ── Main builder ─────────────────────────────────────────────────────────────

async function buildDOCX(data) {
  const {
    reportNum, cliente, contacto = '—', ubicacion = '—',
    equipo, fecha, horario, tecnicos,
    observaciones = 'Sin observaciones adicionales.',
    insumos = [],
    fotos = [],
    tipoServicio = 'Limpieza Correctiva',
  } = data;

  const logoBuffer = fs.readFileSync(LOGO_PATH);
  let firmaBuffer = null;
  try { firmaBuffer = fs.readFileSync(FIRMA_PATH); } catch (_) {}

  const tecnicosArr = Array.isArray(tecnicos)
    ? tecnicos
    : tecnicos.split(/[,\n]/).map(t => t.trim()).filter(Boolean);
  const fotosArr = Array.isArray(fotos) ? fotos : [];

  const children = [];

  // ── HEADER ─────────────────────────────────────────────────────────────
  children.push(
    tbl([new TableRow({ children: [
      shCell(N, [
        p([new ImageRun({ data: logoBuffer, transformation: { width: 90, height: 56 }, type: 'png' })], {
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
        }),
      ], { width: { size: 18, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),

      shCell(N, [
        p([r('INFORME TÉCNICO DE INTERVENCIÓN', { color: G, bold: true, size: 16 })], {
          spacing: { before: 100, after: 40 },
        }),
        p([r(`Limpieza y Desinfección — ${tipoServicio}`, { color: WH, bold: true, size: 28 })], {
          spacing: { before: 0, after: 40 },
        }),
        p([r('Inocuar L&D Total  ·  NIT 901.318.638  ·  Medellín, Colombia', { color: G2, size: 18 })], {
          spacing: { before: 0, after: 100 },
        }),
      ], { width: { size: 58, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),

      shCell(N, [
        p([r('REPORTE', { color: G, bold: true, size: 16 })], {
          alignment: AlignmentType.RIGHT, spacing: { before: 100, after: 40 },
        }),
        p([r(`N° ${String(reportNum).padStart(3, '0')}`, { color: WH, bold: true, size: 52 })], {
          alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 40 },
        }),
        p([r(tipoServicio, { color: G2, size: 16 })], {
          alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 30 },
        }),
        p([r(fecha, { color: G4, size: 16 })], {
          alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 100 },
        }),
      ], { width: { size: 24, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),
    ]})]),
  );

  // ── KPI STRIP ──────────────────────────────────────────────────────────
  children.push(p('', { spacing: { before: 0, after: 100 } }));

  const kpiData = [
    { value: horario,               label: 'Horario Operación',      color: B,       accent: B },
    { value: String(insumos.length), label: 'Insumos Trazados',       color: G,       accent: G },
    { value: String(tecnicosArr.length), label: 'Técnicos Certificados', color: N,    accent: B },
    { value: '✓',                   label: 'Inocuidad Confirmada',   color: '2ECC82', accent: '2ECC82' },
  ];

  children.push(
    tbl([new TableRow({ children: kpiData.map(k =>
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: G1 },
        children: [
          p([r(k.value, { color: k.color, bold: true, size: 36 })], {
            alignment: AlignmentType.CENTER, spacing: { before: 100, after: 40 },
          }),
          p([r(k.label.toUpperCase(), { color: G4, bold: true, size: 16 })], {
            alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 },
          }),
        ],
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 12, color: k.accent },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left:   { style: BorderStyle.NONE, size: 0 },
          right:  { style: BorderStyle.NONE, size: 0 },
        },
      })
    )})])
  );

  // ── SECCIÓN 1: INFORMACIÓN ─────────────────────────────────────────────
  children.push(p('', { spacing: { before: 0, after: 100 } }));
  children.push(sectionHeader(1, 'Información de la Operación', 'Datos generales'));
  children.push(goldDivider());
  children.push(tbl([
    new TableRow({ children: [infoCell('Cliente Final', cliente, true), infoCell('Contacto en sitio', contacto)] }),
    new TableRow({ children: [infoCell('Ubicación', ubicacion), infoCell('Contratista', 'H&Y Mundo Servicios S.A.S')] }),
    new TableRow({ children: [infoCell('Fecha de Ejecución', fecha), infoCell('Horario de Intervención', horario)] }),
    new TableRow({ children: [infoCell('Equipo Intervenido', equipo), infoCell('Tipo de Servicio', tipoServicio)] }),
  ]));

  // ── SECCIÓN 2: EQUIPO ──────────────────────────────────────────────────
  children.push(p('', { spacing: { before: 0, after: 100 } }));
  children.push(sectionHeader(2, 'Equipo de Intervención', 'Personal técnico'));
  children.push(goldDivider());

  for (let i = 0; i < tecnicosArr.length; i += 2) {
    const makeTeamCell = (techName, idx) => new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      children: [
        p([r(idx === 0 ? 'DIRECTOR DE OPERACIONES' : 'AUXILIAR L&D', { color: B, bold: true, size: 16 })], {
          spacing: { before: 80, after: 40 },
        }),
        p([r(techName, { color: N, bold: true, size: 26 })], { spacing: { before: 0, after: 40 } }),
        p([r('✓ Certificado', { color: GR, bold: true, size: 16 })], { spacing: { before: 0, after: 80 } }),
      ],
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.SINGLE, size: 12, color: G },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
    });

    const rightTech = tecnicosArr[i + 1];
    children.push(tbl([
      new TableRow({ children: [
        makeTeamCell(tecnicosArr[i], i),
        rightTech
          ? makeTeamCell(rightTech, i + 1)
          : new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [p('')], borders: NB }),
      ]}),
    ]));
  }

  // ── SECCIÓN 3: INSUMOS (condicional) ───────────────────────────────────
  let secNum = 3;
  if (insumos.length > 0) {
    children.push(p('', { spacing: { before: 0, after: 100 } }));
    children.push(sectionHeader(secNum, 'Trazabilidad de Insumos', 'Control de calidad'));
    children.push(goldDivider());

    const tableBorder = { style: BorderStyle.SINGLE, size: 4, color: G2 };
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder, insideHorizontal: tableBorder, insideVertical: tableBorder },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['Producto', 'Lote', 'Vencimiento', 'Concentración', 'Estado'].map(h =>
            shCell(N, [p([r(h, { color: WH, bold: true, size: 16 })], {
              alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 },
            })])
          ),
        }),
        ...insumos.map((ins, idx) =>
          new TableRow({ children: [
            shCell(idx % 2 === 0 ? WH : G1, [p([r(ins.nombre, { color: N, bold: true, size: 20 })], { spacing: { before: 60, after: 60 } })]),
            shCell(idx % 2 === 0 ? WH : G1, [p([r(ins.lote || '—', { color: B, bold: true, size: 18 })], { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })]),
            shCell(idx % 2 === 0 ? WH : G1, [p([r(ins.vencimiento || '—', { size: 18 })], { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })]),
            shCell(idx % 2 === 0 ? WH : G1, [p([r(ins.concentracion || '—', { color: N, bold: true, size: 18 })], { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })]),
            shCell(idx % 2 === 0 ? WH : G1, [p([r(ins.vencido ? '⚠ Vencido' : '✓ Vigente', { color: ins.vencido ? 'C1272D' : GR, bold: true, size: 18 })], { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })]),
          ]}),
        ),
      ],
    }));
    secNum++;
  }

  // ── SECCIÓN: PROCEDIMIENTO ─────────────────────────────────────────────
  children.push(p('', { spacing: { before: 0, after: 100 } }));
  children.push(sectionHeader(secNum, 'Descripción del Procedimiento Técnico', '4 fases'));
  children.push(goldDivider());

  const fases = [
    { num: 'I',   titulo: 'Alistamiento y Logística',   cuerpo: 'Ingreso controlado al área de intervención. Acondicionamiento y preparación técnica de equipos: bomba manual, aspersores y sistemas de aplicación especializada.' },
    { num: 'II',  titulo: 'Desarme y Lavado Profundo',  cuerpo: 'Remoción inicial con preenjuague con agua potable. Limpieza alcalina con detergente y bomba manual. Acción mecánica con cepillos de cerdas suaves. Enjuague final completo.' },
    { num: 'III', titulo: 'Limpieza y Desinfección',    cuerpo: 'Limpieza ácida con detergente desincrustante. Desinfección a concentración certificada. Cobertura total en superficies de difícil acceso. Efecto residual sin enjuague posterior.' },
    { num: 'IV',  titulo: 'Armado y Verificación Final', cuerpo: 'Armado de equipos y verificación de funcionamiento. Desinfección final y secado con microfibra de alta calidad. Inspección final de conformidad y entrega al cliente.' },
  ];

  for (let i = 0; i < fases.length; i += 2) {
    const makeFaseCell = (f) => new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      children: [
        p([r(`${f.num}  `, { color: N, bold: true, size: 26 }), r(f.titulo.toUpperCase(), { color: N, bold: true, size: 20 })], {
          spacing: { before: 80, after: 60 },
        }),
        p([r(f.cuerpo, { color: '4A5568', size: 18 })], { spacing: { before: 0, after: 80 } }),
      ],
      borders: {
        top:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left:   { style: BorderStyle.SINGLE, size: 4, color: G2 },
        right:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
    });
    children.push(tbl([new TableRow({ children: [makeFaseCell(fases[i]), makeFaseCell(fases[i + 1])] })]));
  }

  if (observaciones !== 'Sin observaciones adicionales.') {
    children.push(tbl([new TableRow({ children: [
      new TableCell({
        children: [
          p([r('OBSERVACIONES DEL TÉCNICO', { color: N, bold: true, size: 16 })], { spacing: { before: 80, after: 40 } }),
          p([r(observaciones, { size: 20 })], { spacing: { before: 0, after: 80 } }),
        ],
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FBF5E6' },
        borders: {
          top:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          left:   { style: BorderStyle.SINGLE, size: 16, color: G },
          right:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
        },
      }),
    ]})]));
  }

  secNum++;

  // ── SECCIÓN: GALERÍA FOTOGRÁFICA ───────────────────────────────────────
  children.push(p('', { spacing: { before: 0, after: 100 } }));
  children.push(sectionHeader(secNum, 'Registro Fotográfico', `${fotosArr.length} foto${fotosArr.length !== 1 ? 's' : ''}`));
  children.push(goldDivider());

  for (let i = 0; i < fotosArr.length; i += 3) {
    const chunk = fotosArr.slice(i, i + 3);
    const photoCells = chunk.map((b64, idx) => {
      const rawData = b64.includes(',') ? b64.split(',')[1] : b64;
      const imgBuffer = Buffer.from(rawData, 'base64');
      return new TableCell({
        width: { size: 33, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: BL },
        children: [
          p([new ImageRun({ data: imgBuffer, transformation: { width: 158, height: 122 } })], {
            alignment: AlignmentType.CENTER, spacing: { before: 40, after: 20 },
          }),
          p([r(`Foto ${i + idx + 1} de ${fotosArr.length}`, { color: B, bold: true, size: 16 })], {
            alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
          }),
        ],
        borders: NB,
      });
    });
    while (photoCells.length < 3) {
      photoCells.push(new TableCell({
        width: { size: 33, type: WidthType.PERCENTAGE },
        children: [p('')],
        borders: NB,
      }));
    }
    children.push(tbl([new TableRow({ children: photoCells })]));
    children.push(p('', { spacing: { before: 0, after: 40 } }));
  }

  secNum++;

  // ── SECCIÓN: CONCLUSIÓN ────────────────────────────────────────────────
  children.push(p('', { spacing: { before: 0, after: 100 } }));
  children.push(sectionHeader(secNum, 'Conclusión y Certificación', ''));
  children.push(goldDivider());

  const conclusiones = [
    { titulo: 'Procedimiento completado', texto: 'Intervención ejecutada conforme a protocolos de inocuidad y seguridad alimentaria HACCP.' },
    { titulo: 'Cumplimiento normativo',   texto: 'Trazabilidad completa de insumos: lotes, vencimientos y concentraciones documentados.' },
    { titulo: 'Documentación completa',   texto: 'Registro fotográfico disponible. Documentación lista para auditoría regulatoria.' },
    { titulo: 'Estado final verificado',  texto: 'Equipo funcional, desinfectado y listo para operación. Inocuidad confirmada.' },
  ];

  for (let i = 0; i < conclusiones.length; i += 2) {
    const makeConclCell = (c) => new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E0F0E8' },
      children: [
        p([r('✓  ', { color: GR, bold: true, size: 24 }), r(c.titulo.toUpperCase(), { color: N, bold: true, size: 18 })], { spacing: { before: 80, after: 40 } }),
        p([r(c.texto, { color: '4A5568', size: 18 })], { spacing: { before: 0, after: 80 } }),
      ],
      borders: NB,
    });
    children.push(tbl([new TableRow({ children: [makeConclCell(conclusiones[i]), makeConclCell(conclusiones[i + 1])] })]));
  }

  children.push(tbl([new TableRow({ children: [
    new TableCell({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: BL },
      children: [p([
        r('Agradecemos la confianza en ', { size: 20 }),
        r('H&Y Mundo Servicios S.A.S — Inocuar L&D Total', { color: B, bold: true, size: 20 }),
        r('. Nuestro compromiso es garantizar la inocuidad alimentaria y la operación eficiente de sus instalaciones.', { size: 20 }),
      ], { spacing: { before: 80, after: 80 } })],
      borders: {
        top:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left:   { style: BorderStyle.SINGLE, size: 16, color: B },
        right:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
    }),
  ]})]));

  secNum++;

  // ── SECCIÓN: FIRMAS ────────────────────────────────────────────────────
  children.push(p('', { spacing: { before: 0, after: 100 } }));
  children.push(sectionHeader(secNum, 'Autorización y Conformidad', ''));
  children.push(goldDivider());

  const firmaLineTable = () => tbl([new TableRow({ children: [
    new TableCell({
      children: [p('')],
      borders: {
        top:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: N },
        left:   { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
    }),
  ]})]);

  const directorChildren = [];
  if (firmaBuffer) {
    directorChildren.push(
      p([new ImageRun({ data: firmaBuffer, transformation: { width: 180, height: 70 }, type: 'png' })], {
        alignment: AlignmentType.CENTER, spacing: { before: 40, after: 20 },
      })
    );
  } else {
    directorChildren.push(p('', { spacing: { before: 0, after: 700 } }));
  }
  directorChildren.push(
    firmaLineTable(),
    p([r(tecnicosArr[0] || 'Director de Operaciones', { color: N, bold: true, size: 22 })], {
      alignment: AlignmentType.CENTER, spacing: { before: 60, after: 30 },
    }),
    p([r('DIRECTOR DE OPERACIONES', { color: G4, bold: true, size: 16 })], {
      alignment: AlignmentType.CENTER, spacing: { before: 0, after: 30 },
    }),
    p([r('H&Y Mundo Servicios S.A.S', { size: 18 })], { alignment: AlignmentType.CENTER }),
    p([r('+57 300 151 6187  ·  inocuarldtotal@gmail.com', { color: G4, size: 16 })], {
      alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
    })
  );

  const clienteChildren = [
    p('', { spacing: { before: 0, after: 700 } }),
    firmaLineTable(),
    p([r('Jefe de Planta / Representante', { color: N, bold: true, size: 22 })], {
      alignment: AlignmentType.CENTER, spacing: { before: 60, after: 30 },
    }),
    p([r(cliente.toUpperCase(), { color: G4, bold: true, size: 16 })], {
      alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
    }),
    ...['Nombre:', 'Cédula:', 'Fecha:'].map(label =>
      tbl([new TableRow({ children: [
        new TableCell({
          children: [p([r(label, { color: G4, size: 18 })], { spacing: { before: 40, after: 40 } })],
          borders: {
            top:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: G2 },
            left:   { style: BorderStyle.NONE, size: 0, color: 'auto' },
            right:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
          },
        }),
      ]})])
    ),
  ];

  children.push(tbl([new TableRow({ children: [
    new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: directorChildren, borders: NB }),
    new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: clienteChildren, borders: NB }),
  ]})]));

  // ── FOOTER ─────────────────────────────────────────────────────────────
  children.push(p('', { spacing: { before: 0, after: 100 } }));
  children.push(
    tbl([new TableRow({ children: [
      shCell(N, [
        p([r('H&Y Mundo Servicios S.A.S — Inocuar L&D Total  ·  NIT 901.318.638  ·  Medellín, Antioquia, Colombia  ·  +57 300 151 6187', { color: WH, size: 16 })], {
          spacing: { before: 80, after: 80 },
        }),
      ], { width: { size: 70, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),
      shCell(N, [
        p([r(`REF: HY-IT-${String(reportNum).padStart(3, '0')} · ${new Date().getFullYear()}`, { color: G, bold: true, size: 16 })], {
          alignment: AlignmentType.RIGHT, spacing: { before: 60, after: 20 },
        }),
        p([r('Documento auditable  ·  Confidencial', { color: G2, size: 14 })], {
          alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 60 },
        }),
      ], { width: { size: 30, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),
    ]})])
  );

  // ── Documento final ─────────────────────────────────────────────────────
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size:   { width: 11906, height: 16838 }, // A4 en twips
          margin: { top: 850, bottom: 850, left: 1134, right: 1134 },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildDOCX };
