const path = require('path');
const fs   = require('fs');

const LOGO_PATH = path.resolve(__dirname, 'H&Y_LOGO_2.png');

function logoBase64() {
  const data = fs.readFileSync(LOGO_PATH);
  return `data:image/png;base64,${data.toString('base64')}`;
}

function photoTag(b64) {
  if (!b64) return `
    <div class="gallery-placeholder">
      <div class="ph-icon">📷</div>
      <div class="ph-text">Sin foto</div>
    </div>`;
  return `<img src="${b64}" style="width:100%;height:180px;object-fit:cover;display:block;">`;
}

function buildHTML(data) {
  const logo = logoBase64();
  const {
    reportNum, cliente, contacto = '—', ubicacion = '—',
    equipo, fecha, horario, tecnicos,
    observaciones = 'Sin observaciones adicionales.',
    insumos = [],
    fotos = [],
    tipoServicio = 'Limpieza Correctiva',
  } = data;

  const insumosRows = insumos.map(i => `
    <tr class="${i.vencido ? 'alerta-row' : ''}">
      <td>
        <div class="prod-name">${i.nombre}</div>
        <div class="prod-type">${i.tipo || ''}</div>
      </td>
      <td><span class="lote-tag">${i.lote || '—'}</span></td>
      <td>${i.vencimiento || '—'}</td>
      <td><span class="conc-value">${i.concentracion || '—'}</span></td>
      <td>
        <div class="status-dot ${i.vencido ? 'warn' : 'ok'}">
          <div class="dot ${i.vencido ? 'red' : 'green'}"></div>
          ${i.vencido ? 'Vencido ⚠' : 'Vigente'}
        </div>
      </td>
    </tr>`).join('');

  const tecnicosArr = Array.isArray(tecnicos)
    ? tecnicos
    : tecnicos.split(/[,\n]/).map(t => t.trim()).filter(Boolean);

  const tecnicoCards = tecnicosArr.map((t, i) => `
    <div class="team-card">
      <div class="team-role">${i === 0 ? 'Director de Operaciones' : 'Auxiliar L&D'}</div>
      <div class="team-name">${t}</div>
      <span class="cert-tag">✓ Certificado HACCP</span>
    </div>`).join('');

  const fotosArr = Array.isArray(fotos) ? fotos : [];
  const galleryItems = fotosArr.map((foto, idx) => `
    <div class="gallery-item">
      ${photoTag(foto)}
      <div class="gallery-caption">Foto ${idx + 1} de ${fotosArr.length}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte #${reportNum} — H&Y Mundo Servicios</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --navy:#0D1B2A; --blue:#0052A3; --blue-light:#E8F1FC;
      --gold:#C9A84C; --gold-light:#F0D98C; --gold-bg:#FBF5E6;
      --red:#C1272D; --gray-1:#F8F9FC; --gray-2:#E4E9F2;
      --gray-3:#B0B8C8; --gray-4:#6B7789;
      --text:#1A2332; --text-soft:#4A5568;
      --green:#145C38; --green-bg:#E0F0E8;
    }
    *{margin:0;padding:0;box-sizing:border-box;
      -webkit-print-color-adjust:exact!important;
      print-color-adjust:exact!important;}
    body{font-family:'Inter','Segoe UI',sans-serif;background:#DDE3EE;
         color:var(--text);font-size:13px;line-height:1.5;}
    .doc{width:794px;margin:0 auto;background:#fff;
         box-shadow:0 0 60px rgba(0,0,0,0.18);}

    /* === HEADER === */
    .header{background:var(--navy);position:relative;overflow:hidden;}
    .deco-c1{position:absolute;top:-50px;right:-50px;width:180px;height:180px;
      border-radius:50%;background:rgba(201,168,76,0.10);}
    .deco-c2{position:absolute;top:10px;right:90px;width:90px;height:90px;
      border-radius:50%;background:rgba(0,82,163,0.22);}
    .deco-c3{position:absolute;bottom:36px;right:16px;width:40px;height:40px;
      border-radius:50%;background:rgba(255,255,255,0.04);}
    .header-inner{padding:28px 32px 26px;display:flex;align-items:center;
      gap:22px;position:relative;z-index:1;}
    .header-logo-wrap{background:#fff;border-radius:10px;padding:12px 16px;
      box-shadow:0 6px 24px rgba(0,0,0,0.35);flex-shrink:0;
      display:flex;align-items:center;justify-content:center;}
    .header-logo-wrap img{height:62px;width:auto;}
    .header-body{flex:1;}
    .doc-label{font-size:10px;font-weight:600;letter-spacing:2px;
      text-transform:uppercase;color:var(--gold);margin-bottom:6px;}
    .header-body h1{font-size:17px;font-weight:700;color:#fff;
      margin-bottom:4px;line-height:1.3;}
    .header-sub{font-size:11px;color:rgba(255,255,255,.48);}
    .report-badge{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);
      border-radius:10px;padding:14px 18px;text-align:right;flex-shrink:0;min-width:148px;}
    .badge-label{font-size:9px;font-weight:600;letter-spacing:2px;
      text-transform:uppercase;color:var(--gold);margin-bottom:4px;}
    .badge-num{font-size:26px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:6px;}
    .badge-tipo{font-size:10px;color:rgba(255,255,255,.68);margin-bottom:2px;}
    .badge-fecha{font-size:10px;color:rgba(255,255,255,.40);}
    /* wave: SVG fills with --gray-1 (#F8F9FC) to create curved edge */
    .header-wave{display:block;width:100%;height:34px;}

    /* === KPI STRIP === */
    .kpi-strip{background:var(--gray-1);padding:20px 32px;
      border-bottom:1px solid var(--gray-2);}
    .kpi-strip-label{font-size:9px;font-weight:700;letter-spacing:2.5px;
      text-transform:uppercase;color:var(--gray-4);margin-bottom:12px;}
    .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
    .kpi-card{background:#fff;border-radius:8px;padding:16px;
      border:1px solid var(--gray-2);border-top:3px solid var(--blue);
      box-shadow:0 2px 10px rgba(0,0,0,0.055);}
    .kpi-card.gold{border-top-color:var(--gold);}
    .kpi-card.green{border-top-color:#2ECC82;}
    .kpi-value{font-size:24px;font-weight:800;color:var(--navy);
      line-height:1;margin-bottom:4px;}
    .kpi-value.sm{font-size:15px;line-height:1.3;font-weight:700;}
    .kpi-value.green{color:#2ECC82;}
    .kpi-value.gold-c{color:var(--gold);}
    .kpi-label{font-size:10px;font-weight:500;color:var(--gray-4);
      text-transform:uppercase;letter-spacing:.5px;}

    /* === SECTION === */
    .section{padding:24px 32px;border-bottom:1px solid var(--gray-2);background:#fff;}
    .section-header{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
    .section-num{width:28px;height:28px;background:var(--navy);color:#fff;
      font-size:11px;font-weight:800;border-radius:50%;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .section-title{font-size:13px;font-weight:700;color:var(--navy);
      text-transform:uppercase;letter-spacing:.8px;flex:1;}
    .section-badge{font-size:9px;font-weight:700;letter-spacing:1px;
      text-transform:uppercase;padding:4px 12px;background:var(--blue-light);
      border-radius:100px;color:var(--blue);}
    .section-divider{height:2px;background:linear-gradient(90deg,var(--gold),transparent);
      margin-bottom:16px;border-radius:2px;}

    /* === INFO GRID === */
    .info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
    .info-cell{background:var(--gray-1);border-radius:6px;padding:12px 16px;
      border:1px solid var(--gray-2);}
    .info-label{font-size:9px;font-weight:700;letter-spacing:1.4px;
      text-transform:uppercase;color:var(--blue);margin-bottom:4px;}
    .info-value{font-size:13px;font-weight:600;color:var(--navy);}
    .info-value.highlight{color:var(--blue);}
    .tipo-tag{display:inline-block;background:var(--navy);color:var(--gold-light);
      font-size:9px;font-weight:700;letter-spacing:1.5px;
      text-transform:uppercase;padding:4px 10px;border-radius:4px;}

    /* === EQUIPO === */
    .team-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
    .team-card{border:1px solid var(--gray-2);border-left:4px solid var(--gold);
      padding:16px 18px;background:#fff;border-radius:0 8px 8px 0;
      box-shadow:0 2px 10px rgba(0,0,0,0.055);}
    .team-role{font-size:9px;font-weight:700;letter-spacing:1.5px;
      text-transform:uppercase;color:var(--blue);margin-bottom:6px;}
    .team-name{font-size:14px;font-weight:800;color:var(--navy);margin-bottom:8px;}
    .cert-tag{display:inline-block;background:var(--green-bg);
      color:var(--green);font-size:9px;font-weight:700;letter-spacing:1px;
      text-transform:uppercase;padding:3px 8px;border-radius:100px;
      border:1px solid #8ECFAA;}

    /* === TABLA === */
    .table-wrap{border-radius:8px;overflow:hidden;
      border:1px solid var(--gray-2);box-shadow:0 2px 10px rgba(0,0,0,0.055);}
    .insumos-table{width:100%;border-collapse:collapse;}
    .insumos-table thead tr{background:var(--navy);}
    .insumos-table th{padding:10px 13px;text-align:left;font-size:9px;
      font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
      color:rgba(255,255,255,.75);}
    .insumos-table td{padding:11px 13px;border-bottom:1px solid var(--gray-2);
      font-size:12px;vertical-align:middle;}
    .insumos-table tbody tr:last-child td{border-bottom:none;}
    .insumos-table tbody tr:nth-child(even) td{background:var(--gray-1);}
    .prod-name{font-weight:700;color:var(--navy);}
    .prod-type{font-size:10px;color:var(--gray-4);margin-top:1px;}
    .lote-tag{font-family:'Courier New',monospace;font-size:11px;font-weight:700;
      color:var(--blue);background:var(--blue-light);padding:3px 7px;
      border-radius:4px;border:1px solid #C2D9F0;}
    .conc-value{font-weight:700;color:var(--navy);}
    .status-dot{display:inline-flex;align-items:center;gap:5px;
      font-size:11px;font-weight:600;}
    .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
    .dot.green{background:var(--green);}
    .dot.red{background:var(--red);}
    .status-dot.ok{color:var(--green);}
    .status-dot.warn{color:var(--red);}
    .alerta-row{background:#FEF2F2!important;}
    .alerta-row td{border-bottom-color:#FCD0D0!important;}

    /* === FASES === */
    .fases-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
    .fase-card{border:1px solid var(--gray-2);border-radius:8px;
      padding:16px;background:#fff;box-shadow:0 2px 10px rgba(0,82,163,.05);}
    .fase-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
    .fase-num{width:30px;height:30px;background:var(--gold);color:var(--navy);
      font-size:13px;font-weight:800;border-radius:50%;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .fase-titulo{font-size:11px;font-weight:700;color:var(--navy);
      text-transform:uppercase;letter-spacing:.5px;}
    .fase-body{font-size:11px;color:var(--text-soft);line-height:1.65;}
    .fase-body strong{color:var(--navy);font-weight:700;}

    /* === GALERÍA === */
    .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
    .gallery-item{border-radius:8px;overflow:hidden;border:1px solid var(--gray-2);
      box-shadow:0 2px 10px rgba(0,0,0,0.07);}
    .gallery-placeholder{height:180px;background:var(--gray-1);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:8px;}
    .ph-icon{font-size:28px;opacity:.4;}
    .ph-text{font-size:10px;font-weight:700;letter-spacing:1.5px;
      text-transform:uppercase;color:var(--gray-4);}
    .gallery-caption{background:var(--blue-light);color:var(--blue);
      font-size:10px;font-weight:600;letter-spacing:.5px;
      padding:7px 12px;text-align:center;}

    /* === CONCLUSIÓN === */
    .conclusion-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
    .concl-item{display:flex;gap:12px;padding:13px 15px;
      background:var(--green-bg);border-radius:6px;border:1px solid #8ECFAA;}
    .concl-check{color:var(--green);font-size:16px;font-weight:800;
      flex-shrink:0;margin-top:1px;}
    .concl-text strong{display:block;font-size:10px;font-weight:800;
      color:var(--navy);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
    .concl-text span{font-size:11px;color:var(--text-soft);line-height:1.5;}
    .concl-closing{margin-top:14px;padding:16px 20px;
      background:var(--blue-light);border-left:4px solid var(--blue);
      border-radius:0 8px 8px 0;color:var(--navy);font-size:11.5px;line-height:1.7;}
    .concl-closing strong{color:var(--blue);}

    /* === FIRMAS === */
    .firma-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:40px;margin-top:10px;}
    .firma-card{text-align:center;}
    .firma-space{height:60px;border-bottom:1.5px solid var(--navy);margin-bottom:10px;}
    .firma-name{font-size:12px;font-weight:700;color:var(--navy);margin-bottom:2px;}
    .firma-cargo{font-size:10px;font-weight:600;letter-spacing:1px;
      text-transform:uppercase;color:var(--gray-4);margin-bottom:6px;}
    .firma-data{font-size:10px;color:var(--gray-4);line-height:1.7;}
    .firma-fields{margin-top:8px;text-align:left;display:inline-block;width:100%;}
    .firma-fields div{font-size:10px;color:var(--gray-4);padding:5px 0;
      border-bottom:1.5px solid var(--gray-2);min-width:240px;margin-bottom:6px;
      padding-right:150px;}

    /* === OBS === */
    .obs-box{background:var(--gold-bg);border:1px solid #E8D48A;
      border-left:4px solid var(--gold);padding:14px 16px;
      border-radius:0 6px 6px 0;
      font-size:12px;color:var(--text-soft);line-height:1.7;margin-top:14px;}
    .obs-box strong{color:var(--navy);display:block;
      font-size:9px;font-weight:700;letter-spacing:1.4px;
      text-transform:uppercase;margin-bottom:6px;}

    /* === FOOTER === */
    .footer{background:var(--navy);padding:18px 32px;display:flex;
      justify-content:space-between;align-items:center;}
    .footer-left{display:flex;align-items:center;gap:12px;}
    .footer-logo{height:34px;width:auto;opacity:.85;}
    .footer-info{font-size:10px;color:rgba(255,255,255,.55);line-height:1.7;}
    .footer-info strong{color:rgba(255,255,255,.8);font-weight:600;}
    .footer-right{text-align:right;}
    .footer-docref{font-size:10px;color:var(--gold);font-weight:600;
      letter-spacing:.5px;margin-bottom:3px;}
    .footer-stamp{font-size:9px;color:rgba(255,255,255,.35);}
  </style>
</head>
<body>
<div class="doc">

  <!-- HEADER con onda al pie -->
  <div class="header">
    <div class="deco-c1"></div>
    <div class="deco-c2"></div>
    <div class="deco-c3"></div>
    <div class="header-inner">
      <div class="header-logo-wrap">
        <img src="${logo}" alt="H&amp;Y Mundo Servicios">
      </div>
      <div class="header-body">
        <div class="doc-label">Informe Técnico de Intervención</div>
        <h1>Limpieza y Desinfección — ${tipoServicio}</h1>
        <div class="header-sub">Inocuar L&amp;D Total · NIT 901.318.638 · Medellín, Colombia</div>
      </div>
      <div class="report-badge">
        <div class="badge-label">Reporte</div>
        <div class="badge-num">N° ${String(reportNum).padStart(3,'0')}</div>
        <div class="badge-tipo">${tipoServicio}</div>
        <div class="badge-fecha">${fecha}</div>
      </div>
    </div>
    <!-- Onda blanca en el pie del header: el fill #F8F9FC = --gray-1 del kpi-strip -->
    <svg class="header-wave" viewBox="0 0 794 34" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,34 L0,22 C200,2 480,34 794,14 L794,34 Z" fill="#F8F9FC"/>
    </svg>
  </div>

  <!-- KPI STRIP -->
  <div class="kpi-strip">
    <div class="kpi-strip-label">Resumen ejecutivo</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value sm">${horario}</div>
        <div class="kpi-label">Horario operación</div>
      </div>
      <div class="kpi-card gold">
        <div class="kpi-value gold-c">${insumos.length}</div>
        <div class="kpi-label">Insumos trazados</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${tecnicosArr.length}</div>
        <div class="kpi-label">Técnicos certificados</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-value green">✓</div>
        <div class="kpi-label">Inocuidad confirmada</div>
      </div>
    </div>
  </div>

  <!-- 1. INFORMACIÓN -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">1</div>
      <div class="section-title">Información de la Operación</div>
      <div class="section-badge">Datos generales</div>
    </div>
    <div class="section-divider"></div>
    <div class="info-grid">
      <div class="info-cell">
        <div class="info-label">Cliente Final</div>
        <div class="info-value highlight">${cliente}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Contacto en sitio</div>
        <div class="info-value">${contacto}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Ubicación</div>
        <div class="info-value">${ubicacion}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Contratista</div>
        <div class="info-value">H&amp;Y Mundo Servicios S.A.S<br>Inocuar L&amp;D Total</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Fecha de Ejecución</div>
        <div class="info-value">${fecha}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Horario de Intervención</div>
        <div class="info-value">${horario}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Equipo Intervenido</div>
        <div class="info-value">${equipo}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Tipo de Servicio</div>
        <div class="info-value"><span class="tipo-tag">${tipoServicio}</span></div>
      </div>
    </div>
  </div>

  <!-- 2. EQUIPO -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">2</div>
      <div class="section-title">Equipo de Intervención</div>
      <div class="section-badge">Personal técnico</div>
    </div>
    <div class="section-divider"></div>
    <div class="team-grid">${tecnicoCards}</div>
  </div>

  <!-- 3. INSUMOS (condicional) -->
  ${insumos.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">3</div>
      <div class="section-title">Trazabilidad de Insumos</div>
      <div class="section-badge">Control de calidad</div>
    </div>
    <div class="section-divider"></div>
    <div class="table-wrap">
      <table class="insumos-table">
        <thead>
          <tr>
            <th>Producto</th><th>Lote</th><th>Vencimiento</th>
            <th>Concentración</th><th>Estado</th>
          </tr>
        </thead>
        <tbody>${insumosRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- 4 (o 3). PROCEDIMIENTO -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">${insumos.length > 0 ? 4 : 3}</div>
      <div class="section-title">Descripción del Procedimiento Técnico</div>
      <div class="section-badge">4 fases</div>
    </div>
    <div class="section-divider"></div>
    <div class="fases-grid">
      <div class="fase-card">
        <div class="fase-header">
          <div class="fase-num">I</div>
          <div class="fase-titulo">Alistamiento y Logística</div>
        </div>
        <div class="fase-body">Ingreso controlado al área de intervención. Acondicionamiento y preparación técnica de equipos: bomba manual, aspersores y sistemas de aplicación especializada.</div>
      </div>
      <div class="fase-card">
        <div class="fase-header">
          <div class="fase-num">II</div>
          <div class="fase-titulo">Desarme y Lavado Profundo</div>
        </div>
        <div class="fase-body"><strong>Remoción inicial:</strong> Preenjuague con agua potable. <strong>Limpieza alcalina:</strong> Aplicación de detergente con bomba manual. <strong>Acción mecánica:</strong> Cepillos de cerdas suaves. <strong>Enjuague final:</strong> Aclarado completo.</div>
      </div>
      <div class="fase-card">
        <div class="fase-header">
          <div class="fase-num">III</div>
          <div class="fase-titulo">Limpieza y Desinfección</div>
        </div>
        <div class="fase-body"><strong>Limpieza ácida:</strong> Detergente desincrustante con aspersor manual. <strong>Desinfección:</strong> Aplicación de desinfectante a concentración certificada. Cobertura total en superficies de difícil acceso. Efecto residual sin enjuague posterior.</div>
      </div>
      <div class="fase-card">
        <div class="fase-header">
          <div class="fase-num">IV</div>
          <div class="fase-titulo">Armado y Verificación Final</div>
        </div>
        <div class="fase-body">Armado de equipos y verificación de funcionamiento. Desinfección final y secado con microfibra de alta calidad. Inspección final de conformidad y entrega al cliente.</div>
      </div>
    </div>
    ${observaciones !== 'Sin observaciones adicionales.' ? `
    <div class="obs-box">
      <strong>Observaciones del técnico</strong>
      ${observaciones}
    </div>` : ''}
  </div>

  <!-- 5 (o 4). GALERÍA -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">${insumos.length > 0 ? 5 : 4}</div>
      <div class="section-title">Registro Fotográfico</div>
      <div class="section-badge">${fotosArr.length} foto${fotosArr.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="section-divider"></div>
    <div class="gallery">
      ${galleryItems}
    </div>
  </div>

  <!-- 6 (o 5). CONCLUSIÓN -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">${insumos.length > 0 ? 6 : 5}</div>
      <div class="section-title">Conclusión y Certificación</div>
    </div>
    <div class="section-divider"></div>
    <div class="conclusion-grid">
      <div class="concl-item">
        <div class="concl-check">✓</div>
        <div class="concl-text">
          <strong>Procedimiento completado</strong>
          <span>Intervención ejecutada conforme a protocolos de inocuidad y seguridad alimentaria HACCP.</span>
        </div>
      </div>
      <div class="concl-item">
        <div class="concl-check">✓</div>
        <div class="concl-text">
          <strong>Cumplimiento normativo</strong>
          <span>Trazabilidad completa de insumos: lotes, vencimientos y concentraciones documentados.</span>
        </div>
      </div>
      <div class="concl-item">
        <div class="concl-check">✓</div>
        <div class="concl-text">
          <strong>Documentación completa</strong>
          <span>Registro fotográfico disponible. Documentación lista para auditoría regulatoria.</span>
        </div>
      </div>
      <div class="concl-item">
        <div class="concl-check">✓</div>
        <div class="concl-text">
          <strong>Estado final verificado</strong>
          <span>Equipo funcional, desinfectado y listo para operación. Inocuidad confirmada.</span>
        </div>
      </div>
    </div>
    <div class="concl-closing">
      Agradecemos la confianza en <strong>H&amp;Y Mundo Servicios S.A.S — Inocuar L&amp;D Total</strong>.<br>
      Nuestro compromiso es garantizar la inocuidad alimentaria y la operación eficiente de sus instalaciones.
    </div>
  </div>

  <!-- 7 (o 6). FIRMAS -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">${insumos.length > 0 ? 7 : 6}</div>
      <div class="section-title">Autorización y Conformidad</div>
    </div>
    <div class="section-divider"></div>
    <div class="firma-grid">
      <div class="firma-card">
        <div class="firma-space"></div>
        <div class="firma-name">${tecnicosArr[0] || 'Director de Operaciones'}</div>
        <div class="firma-cargo">Director de Operaciones</div>
        <div class="firma-data">H&amp;Y Mundo Servicios S.A.S<br>+57 300 151 6187 · inocuarldtotal@gmail.com</div>
      </div>
      <div class="firma-card">
        <div class="firma-space"></div>
        <div class="firma-name">Jefe de Planta / Representante</div>
        <div class="firma-cargo">${cliente}</div>
        <div class="firma-fields">
          <div>Nombre:</div>
          <div>Cédula:</div>
          <div>Fecha:</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">
      <img src="${logo}" alt="H&amp;Y" class="footer-logo">
      <div class="footer-info">
        <strong>H&amp;Y Mundo Servicios S.A.S — Inocuar L&amp;D Total</strong><br>
        NIT 901.318.638 · Medellín, Antioquia, Colombia<br>
        inocuarldtotal@gmail.com · +57 300 151 6187
      </div>
    </div>
    <div class="footer-right">
      <div class="footer-docref">REF: HY-IT-${String(reportNum).padStart(3,'0')} · ${new Date().getFullYear()}</div>
      <div class="footer-stamp">Documento auditable · Generado ${fecha}</div>
      <div class="footer-stamp" style="margin-top:2px;">Confidencial — Solo para uso del cliente</div>
    </div>
  </div>

</div>
</body>
</html>`;
}

module.exports = { buildHTML };
