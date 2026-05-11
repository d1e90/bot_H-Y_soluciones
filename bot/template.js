const path = require('path');
const fs   = require('fs');

const LOGO_PATH = path.resolve(__dirname, '../H&Y_LOGO_2.png');

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
    fotoAntes, fotoDurante, fotoDespues,
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

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte #${reportNum} — H&Y Mundo Servicios</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --navy:#0D1B2A; --blue:#0052A3; --blue-light:#D6E8F8;
      --gold:#C9A84C; --gold-light:#F0D98C; --gold-bg:#FBF5E6;
      --red:#C1272D; --gray-1:#EEF1F6; --gray-2:#D8DCE6;
      --gray-3:#B0B8C8; --gray-4:#6B7789;
      --text:#0D1B2A; --text-soft:#3A4A5C;
      --green:#145C38; --green-bg:#E0F0E8;
    }
    *{margin:0;padding:0;box-sizing:border-box;
      -webkit-print-color-adjust:exact!important;
      print-color-adjust:exact!important;}
    body{font-family:'Inter','Segoe UI',sans-serif;background:#CBD0DA;
         color:var(--text);font-size:13px;line-height:1.5;}
    .doc{width:794px;margin:0 auto;background:#F4F6FA;}

    /* HEADER */
    .header{background:var(--navy);display:flex;align-items:stretch;min-height:110px;}
    .header-logo-wrap{background:#fff;padding:16px 20px;display:flex;
      align-items:center;justify-content:center;min-width:160px;}
    .header-logo-wrap img{height:70px;width:auto;}
    .header-divider{width:3px;background:var(--gold);}
    .header-body{flex:1;padding:20px 26px;display:flex;flex-direction:column;justify-content:center;}
    .doc-label{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;
      color:var(--gold);margin-bottom:6px;}
    .header-body h1{font-size:19px;font-weight:700;color:#fff;margin-bottom:4px;}
    .header-sub{font-size:11px;color:rgba(255,255,255,.55);}
    .header-meta{padding:20px 26px;display:flex;flex-direction:column;
      justify-content:center;align-items:flex-end;gap:6px;
      border-left:1px solid rgba(255,255,255,.08);}
    .meta-badge{background:var(--gold);color:var(--navy);font-size:20px;
      font-weight:800;padding:6px 16px;}
    .meta-tipo{font-size:10px;font-weight:600;letter-spacing:1.5px;
      text-transform:uppercase;color:rgba(255,255,255,.5);}
    .meta-fecha{font-size:11px;color:rgba(255,255,255,.7);font-weight:500;}
    .gold-stripe{height:4px;background:linear-gradient(90deg,var(--gold),var(--gold-light),var(--gold));}

    /* KPI */
    .exec-summary{background:var(--navy);border-bottom:4px solid var(--gold);padding:20px 30px;}
    .exec-summary-title{font-size:9px;font-weight:700;letter-spacing:2.5px;
      text-transform:uppercase;color:var(--gold);margin-bottom:12px;}
    .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
    .kpi-card{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
      border-top:3px solid var(--blue);padding:14px 16px;}
    .kpi-card.gold{border-top-color:var(--gold);}
    .kpi-card.green{border-top-color:#2ECC82;}
    .kpi-value{font-size:26px;font-weight:800;color:#fff;line-height:1;margin-bottom:4px;}
    .kpi-value.green{color:#2ECC82;}
    .kpi-value.gold-c{color:var(--gold-light);}
    .kpi-label{font-size:10px;font-weight:500;color:rgba(255,255,255,.55);
      text-transform:uppercase;letter-spacing:.5px;}

    /* SECCIÓN */
    .section{padding:26px 30px;border-bottom:2px solid var(--gray-2);background:#fff;}
    .section:nth-child(odd){background:#F4F7FB;}
    .section:last-child{border-bottom:none;}
    .section-header{display:flex;align-items:center;gap:10px;margin-bottom:18px;
      padding-bottom:10px;border-bottom:2px solid var(--blue-light);}
    .section-num{width:26px;height:26px;background:var(--blue);color:#fff;
      font-size:11px;font-weight:800;display:flex;align-items:center;
      justify-content:center;flex-shrink:0;}
    .section-title{font-size:12px;font-weight:800;color:var(--navy);
      text-transform:uppercase;letter-spacing:1px;flex:1;}
    .section-badge{font-size:9px;font-weight:700;letter-spacing:1px;
      text-transform:uppercase;padding:3px 10px;
      background:var(--blue-light);border:1px solid #B8D6F2;color:var(--blue);}

    /* INFO GRID */
    .info-grid{display:grid;grid-template-columns:repeat(2,1fr);
      gap:2px;background:var(--gray-2);border:2px solid var(--gray-2);}
    .info-cell{background:#fff;padding:13px 16px;}
    .info-cell:nth-child(odd){background:var(--blue-light);}
    .info-label{font-size:9px;font-weight:700;letter-spacing:1.4px;
      text-transform:uppercase;color:var(--blue);margin-bottom:4px;}
    .info-value{font-size:13px;font-weight:600;color:var(--navy);}
    .info-value.highlight{color:var(--blue);font-weight:700;}
    .tipo-tag{display:inline-block;background:var(--navy);color:var(--gold-light);
      font-size:9px;font-weight:700;letter-spacing:1.5px;
      text-transform:uppercase;padding:5px 12px;}

    /* EQUIPO */
    .team-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
    .team-card{border:1px solid var(--gray-2);border-left:4px solid var(--gold);
      padding:16px 18px;background:var(--gray-1);
      box-shadow:0 2px 6px rgba(0,0,0,.06);}
    .team-role{font-size:9px;font-weight:700;letter-spacing:1.5px;
      text-transform:uppercase;color:var(--blue);margin-bottom:6px;}
    .team-name{font-size:14px;font-weight:800;color:var(--navy);margin-bottom:8px;}
    .cert-tag{display:inline-block;margin-top:8px;background:var(--green-bg);
      color:var(--green);font-size:9px;font-weight:700;letter-spacing:1px;
      text-transform:uppercase;padding:3px 8px;border:1px solid #8ECFAA;}

    /* TABLA */
    .insumos-table{width:100%;border-collapse:collapse;}
    .insumos-table thead tr{background:var(--navy);}
    .insumos-table th{padding:10px 13px;text-align:left;font-size:9px;
      font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
      color:rgba(255,255,255,.7);}
    .insumos-table td{padding:11px 13px;border-bottom:1px solid var(--gray-2);
      font-size:12px;vertical-align:middle;}
    .insumos-table tbody tr:nth-child(even) td{background:var(--gray-1);}
    .prod-name{font-weight:700;color:var(--navy);}
    .prod-type{font-size:10px;color:var(--gray-4);margin-top:1px;}
    .lote-tag{font-family:'Courier New',monospace;font-size:11px;font-weight:700;
      color:var(--blue);background:#EBF3FC;padding:3px 7px;
      border:1px solid #C2D9F0;}
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

    /* FASES */
    .fases-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
    .fase-card{border:1px solid var(--gray-2);border-top:4px solid var(--blue);
      padding:16px;background:#fff;box-shadow:0 2px 8px rgba(0,82,163,.07);}
    .fase-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
    .fase-num{width:28px;height:28px;background:var(--gold);color:var(--navy);
      font-size:13px;font-weight:800;display:flex;align-items:center;
      justify-content:center;flex-shrink:0;}
    .fase-titulo{font-size:11px;font-weight:700;color:var(--navy);
      text-transform:uppercase;letter-spacing:.5px;}
    .fase-body{font-size:11px;color:var(--text-soft);line-height:1.65;}
    .fase-body strong{color:var(--navy);font-weight:700;}

    /* GALERÍA */
    .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
    .gallery-item{border:1px solid var(--gray-2);overflow:hidden;}
    .gallery-placeholder{height:180px;background:var(--gray-1);
      border-bottom:1px solid var(--gray-2);display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:8px;}
    .ph-icon{font-size:28px;opacity:.4;}
    .ph-text{font-size:10px;font-weight:700;letter-spacing:1.5px;
      text-transform:uppercase;color:var(--gray-4);}
    .gallery-caption{background:var(--navy);color:rgba(255,255,255,.85);
      font-size:10px;font-weight:600;letter-spacing:.8px;
      text-transform:uppercase;padding:7px 12px;}

    /* CONCLUSIÓN */
    .conclusion-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
    .concl-item{display:flex;gap:12px;padding:13px 15px;
      background:var(--green-bg);border:1px solid #8ECFAA;
      border-left:4px solid var(--green);}
    .concl-check{color:var(--green);font-size:14px;font-weight:800;flex-shrink:0;}
    .concl-text strong{display:block;font-size:10px;font-weight:800;
      color:var(--navy);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
    .concl-text span{font-size:11px;color:var(--text-soft);line-height:1.5;}
    .concl-closing{margin-top:14px;padding:14px 16px;background:var(--navy);
      color:rgba(255,255,255,.8);font-size:11.5px;line-height:1.7;text-align:center;}
    .concl-closing strong{color:var(--gold);}

    /* FIRMAS */
    .firma-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:40px;margin-top:10px;}
    .firma-card{text-align:center;}
    .firma-space{height:60px;border-bottom:1.5px solid var(--navy);margin-bottom:10px;}
    .firma-name{font-size:12px;font-weight:700;color:var(--navy);margin-bottom:2px;}
    .firma-cargo{font-size:10px;font-weight:600;letter-spacing:1px;
      text-transform:uppercase;color:var(--gray-4);margin-bottom:6px;}
    .firma-data{font-size:10px;color:var(--gray-4);line-height:1.7;}
    .firma-fields{margin-top:8px;text-align:left;display:inline-block;}
    .firma-fields div{font-size:10px;color:var(--gray-4);padding:4px 0;
      border-bottom:1px solid var(--gray-2);min-width:220px;margin-bottom:4px;}

    /* FOOTER */
    .footer{background:var(--navy);padding:18px 30px;display:flex;
      justify-content:space-between;align-items:center;}
    .footer-left{display:flex;align-items:center;gap:12px;}
    .footer-logo{height:34px;width:auto;opacity:.85;}
    .footer-info{font-size:10px;color:rgba(255,255,255,.55);line-height:1.7;}
    .footer-info strong{color:rgba(255,255,255,.8);font-weight:600;}
    .footer-right{text-align:right;}
    .footer-docref{font-size:10px;color:var(--gold);font-weight:600;
      letter-spacing:.5px;margin-bottom:3px;}
    .footer-stamp{font-size:9px;color:rgba(255,255,255,.35);}

    /* OBSERVACIONES */
    .obs-box{background:var(--gold-bg);border:1px solid #E8D48A;
      border-left:4px solid var(--gold);padding:14px 16px;
      font-size:12px;color:var(--text-soft);line-height:1.7;margin-top:0;}
    .obs-box strong{color:var(--navy);display:block;
      font-size:9px;font-weight:700;letter-spacing:1.4px;
      text-transform:uppercase;margin-bottom:6px;}
  </style>
</head>
<body>
<div class="doc">

  <div class="header">
    <div class="header-logo-wrap">
      <img src="${logo}" alt="H&amp;Y Mundo Servicios">
    </div>
    <div class="header-divider"></div>
    <div class="header-body">
      <div class="doc-label">Informe Técnico de Intervención</div>
      <h1>Limpieza y Desinfección — ${tipoServicio}</h1>
      <div class="header-sub">Inocuar L&amp;D Total · NIT 901.318.638 · Medellín, Colombia</div>
    </div>
    <div class="header-meta">
      <div class="meta-badge">N° ${String(reportNum).padStart(3,'0')}</div>
      <div class="meta-tipo">${tipoServicio}</div>
      <div class="meta-fecha">${fecha}</div>
    </div>
  </div>

  <div class="gold-stripe"></div>

  <div class="exec-summary">
    <div class="exec-summary-title">Resumen Ejecutivo</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${horario}</div>
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

  <div class="section">
    <div class="section-header">
      <div class="section-num">1</div>
      <div class="section-title">Información de la Operación</div>
      <div class="section-badge">Datos generales</div>
    </div>
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

  <div class="section">
    <div class="section-header">
      <div class="section-num">2</div>
      <div class="section-title">Equipo de Intervención</div>
      <div class="section-badge">Personal técnico</div>
    </div>
    <div class="team-grid">${tecnicoCards}</div>
  </div>

  ${insumos.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">3</div>
      <div class="section-title">Trazabilidad de Insumos</div>
      <div class="section-badge">Control de calidad</div>
    </div>
    <table class="insumos-table">
      <thead>
        <tr>
          <th>Producto</th><th>Lote</th><th>Vencimiento</th>
          <th>Concentración</th><th>Estado</th>
        </tr>
      </thead>
      <tbody>${insumosRows}</tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <div class="section-header">
      <div class="section-num">${insumos.length > 0 ? 4 : 3}</div>
      <div class="section-title">Descripción del Procedimiento Técnico</div>
      <div class="section-badge">4 fases</div>
    </div>
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
    <div class="obs-box" style="margin-top:14px;">
      <strong>Observaciones del técnico</strong>
      ${observaciones}
    </div>` : ''}
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-num">${insumos.length > 0 ? 5 : 4}</div>
      <div class="section-title">Registro Fotográfico</div>
      <div class="section-badge">Antes · durante · después</div>
    </div>
    <div class="gallery">
      <div class="gallery-item">
        ${photoTag(fotoAntes)}
        <div class="gallery-caption">Antes · Estado inicial</div>
      </div>
      <div class="gallery-item">
        ${photoTag(fotoDurante)}
        <div class="gallery-caption">Durante · En proceso</div>
      </div>
      <div class="gallery-item">
        ${photoTag(fotoDespues)}
        <div class="gallery-caption">Después · Resultado final</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-num">${insumos.length > 0 ? 6 : 5}</div>
      <div class="section-title">Conclusión y Certificación</div>
    </div>
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

  <div class="section">
    <div class="section-header">
      <div class="section-num">${insumos.length > 0 ? 7 : 6}</div>
      <div class="section-title">Autorización y Conformidad</div>
    </div>
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
          <div>Nombre:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
          <div>Cédula:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
          <div>Fecha:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
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
