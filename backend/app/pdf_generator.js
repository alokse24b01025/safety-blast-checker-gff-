import PDFDocument from 'pdfkit';

const RISK_COLORS = {
  GREEN: '#2e7d32',
  YELLOW: '#f9a825',
  ORANGE: '#ef6c00',
  RED: '#c62828'
};

function drawTable(doc, data, x, startY, colWidths, options = {}) {
  const rowHeight = options.rowHeight || 18;
  const fontSize = options.fontSize || 9;
  const padding = options.padding || 4;
  const isHeader = options.isHeader || false;

  let currentY = startY;
  doc.fontSize(fontSize);

  data.forEach((row, rowIndex) => {
    let maxLines = 1;
    row.forEach((cellText, colIndex) => {
      const text = cellText !== undefined && cellText !== null ? String(cellText) : '';
      const colWidth = colWidths[colIndex];
      const lines = doc.heightOfString(text, { width: colWidth - padding * 2 }) / (fontSize * 1.2);
      if (lines > maxLines) {
        maxLines = Math.ceil(lines);
      }
    });
    
    const actualRowHeight = Math.max(rowHeight, maxLines * fontSize * 1.2 + padding * 2);

    if (options.backgrounds && options.backgrounds[rowIndex]) {
      doc.save()
         .fillColor(options.backgrounds[rowIndex])
         .rect(x, currentY, colWidths.reduce((a, b) => a + b, 0), actualRowHeight)
         .fill();
    } else if (isHeader && rowIndex === 0) {
      doc.save()
         .fillColor('#eeeeee')
         .rect(x, currentY, colWidths.reduce((a, b) => a + b, 0), actualRowHeight)
         .fill();
    }

    let currentX = x;
    row.forEach((cellText, colIndex) => {
      const text = cellText !== undefined && cellText !== null ? String(cellText) : '';
      const colWidth = colWidths[colIndex];

      doc.rect(currentX, currentY, colWidth, actualRowHeight).strokeColor('#d3d3d3').lineWidth(0.5).stroke();

      doc.save();
      if ((options.boldFirstCol && colIndex === 0) || (isHeader && rowIndex === 0) || (options.boldCols && options.boldCols.includes(colIndex))) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }

      if (options.textColors && options.textColors[rowIndex] && options.textColors[rowIndex][colIndex]) {
        doc.fillColor(options.textColors[rowIndex][colIndex]);
      } else {
        doc.fillColor('#000000');
      }

      doc.text(text, currentX + padding, currentY + padding, {
        width: colWidth - padding * 2,
        align: 'left',
        lineBreak: true
      });
      doc.restore();

      currentX += colWidth;
    });

    currentY += actualRowHeight;
  });

  return currentY;
}

export function buildChecklistPdf(submission) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 51, bottom: 51, left: 51, right: 51 }
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const contentWidth = 493;
    const leftMargin = 51;
    let y = 51;

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000').text('Pre-Blast Safety Checklist', leftMargin, y);
    y += 22;
    doc.font('Helvetica').fontSize(10).fillColor('#808080').text('AI Blast Safety Assistant — Advisory Document', leftMargin, y);
    y += 15;

    doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).strokeColor('#808080').lineWidth(0.5).stroke();
    y += 12;

    const riskLevel = submission.risk_level;
    const riskColor = RISK_COLORS[riskLevel] || '#000000';
    const payload = submission.payload || {};

    const summaryData = [
      ['Site Name', submission.site_name, 'Blast ID', submission.blast_id],
      ['Blast Date', payload.blast_date || 'N/A', 'Blast Time', payload.blast_time || 'N/A'],
      ['Risk Score', String(submission.total_score), 'Risk Level', riskLevel]
    ];
    const summaryColWidths = [80, 166.5, 80, 166.5];

    y = drawTable(doc, summaryData, leftMargin, y, summaryColWidths, {
      boldCols: [0, 2],
      backgrounds: ['#f9f9f9', '#f9f9f9', '#f9f9f9'],
      textColors: {
        2: { 3: riskColor }
      },
      boldFirstCol: false
    });
    y += 12;

    const boolStr = (v) => {
      if (v === true) return 'OK';
      if (v === false) return 'FAIL';
      return 'N/A';
    };

    const sections = [
      {
        title: 'Weather',
        rows: [
          ['Temperature (°C)', payload.temperature_c],
          ['Rainfall (mm)', payload.rainfall_mm],
          ['Wind Speed (km/h)', payload.wind_speed_kmh],
          ['Lightning Warning', boolStr(!payload.lightning_warning)]
        ]
      },
      {
        title: 'Shift',
        rows: [
          ['Supervisor Available', boolStr(payload.supervisor_available)],
          ['Blasting Officer Available', boolStr(payload.blasting_officer_available)]
        ]
      },
      {
        title: 'Workforce',
        rows: [
          ['Worker Count', payload.worker_count],
          ['Workers Outside Exclusion Zone', boolStr(!payload.workers_in_exclusion_zone)],
          ['Safety Briefing Completed', boolStr(payload.safety_briefing_completed)]
        ]
      },
      {
        title: 'Equipment',
        rows: [
          ['Detonators Secure', boolStr(payload.detonators_secure)],
          ['Siren Working', boolStr(payload.siren_working)],
          ['Communication Working', boolStr(payload.communication_working)],
          ['Emergency Vehicle Available', boolStr(payload.emergency_vehicle_available)]
        ]
      },
      {
        title: 'Site',
        rows: [
          ['Exclusion Zone Established', boolStr(payload.exclusion_zone_established)],
          ['Barricades In Place', boolStr(payload.barricades_in_place)],
          ['Blast Design Approved', boolStr(payload.blast_design_approved)],
          ['Escape Route Clear', boolStr(payload.escape_route_clear)]
        ]
      }
    ];

    const checklistColWidths = [280, 213];

    sections.forEach(section => {
      if (y > 700) {
        doc.addPage();
        y = 51;
      }

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text(section.title, leftMargin, y);
      y += 14;

      const sectionTableData = section.rows.map(r => [r[0], r[1] !== undefined && r[1] !== null ? String(r[1]) : '']);
      y = drawTable(doc, sectionTableData, leftMargin, y, checklistColWidths);
      y += 10;
    });

    if (y > 700) {
      doc.addPage();
      y = 51;
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('Flagged Issues', leftMargin, y);
    y += 14;

    const issues = submission.issues || [];
    if (issues.length > 0) {
      const issueHeader = [['Issue', 'Weight', 'Critical']];
      const issueRows = issues.map(i => [i.description, String(i.weight), i.critical ? 'YES' : 'no']);
      const issueTableData = [...issueHeader, ...issueRows];
      const issueColWidths = [353, 70, 70];

      y = drawTable(doc, issueTableData, leftMargin, y, issueColWidths, { isHeader: true });
    } else {
      doc.font('Helvetica').fontSize(9).fillColor('#000000').text('No issues flagged by the rule engine.', leftMargin, y);
      y += 12;
    }
    y += 12;

    if (y > 700) {
      doc.addPage();
      y = 51;
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('AI-Generated Recommendation (Advisory Only)', leftMargin, y);
    y += 14;
    doc.font('Helvetica').fontSize(9).fillColor('#000000').text(submission.ai_recommendation || 'No AI recommendation available.', leftMargin, y, {
      width: contentWidth,
      align: 'left'
    });
    const recHeight = doc.heightOfString(submission.ai_recommendation || 'No AI recommendation available.', { width: contentWidth });
    y += recHeight + 15;

    if (y > 660) {
      doc.addPage();
      y = 51;
    }

    doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).strokeColor('#808080').lineWidth(0.5).stroke();
    y += 10;

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('Authorised Blasting Officer Sign-Off', leftMargin, y);
    y += 14;

    const officerDecision = submission.officer_decision || 'PENDING';
    const signoffData = [
      ['Decision', officerDecision],
      ['Officer Name', submission.officer_name || '____________________'],
      ['Comments', submission.officer_comments || ''],
      ['Signature', '____________________'],
      ['Date', '____________________']
    ];
    const signoffColWidths = [100, 393];

    y = drawTable(doc, signoffData, leftMargin, y, signoffColWidths, { boldFirstCol: true });
    y += 15;

    doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).strokeColor('#808080').lineWidth(0.5).stroke();
    y += 6;

    const disclaimerText = 
      `DISCLAIMER: This document is generated by a student prototype application for ` +
      `learning and demonstration purposes only. It is a decision-support aid and does ` +
      `NOT constitute blast approval. All operational use requires review and sign-off ` +
      `by an appropriately qualified and authorised blasting professional in accordance ` +
      `with applicable laws and site safety standards. Generated: ${new Date().toISOString()}`;

    doc.font('Helvetica').fontSize(7.5).fillColor('#808080').text(disclaimerText, leftMargin, y, {
      width: contentWidth,
      align: 'left'
    });

    doc.end();
  });
}
