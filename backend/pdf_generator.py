import io
import hashlib
import base64
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
from reportlab.lib.units import inch

RISK_COLORS = {
    'GREEN': colors.HexColor('#2e7d32'),
    'YELLOW': colors.HexColor('#f9a825'),
    'ORANGE': colors.HexColor('#ef6c00'),
    'RED': colors.HexColor('#c62828')
}

def generate_integrity_hash(submission: dict) -> str:
    """Generates a SHA-256 hash of key submission details to ensure tamper-evidence."""
    payload = submission.get('payload', {})
    content_str = (
        f"{submission.get('site_name')}|"
        f"{submission.get('blast_id')}|"
        f"{submission.get('total_score')}|"
        f"{submission.get('risk_level')}|"
        f"{submission.get('officer_decision') or 'PENDING'}|"
        f"{submission.get('officer_name') or ''}|"
        f"{submission.get('officer_comments') or ''}|"
        f"{payload.get('blast_date') or ''}|"
        f"{payload.get('blast_time') or ''}"
    )
    return hashlib.sha256(content_str.encode('utf-8')).hexdigest()

def build_checklist_pdf(submission: dict) -> bytes:
    buffer = io.BytesIO()
    
    # Page setup - A4 margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=51,
        leftMargin=51,
        topMargin=51,
        bottomMargin=51
    )
    
    styles = getSampleStyleSheet()
    
    # Custom typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.black
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#808080')
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.black,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.black
    )

    body_bold_style = ParagraphStyle(
        'BodyBoldText',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=10,
        textColor=colors.HexColor('#808080')
    )

    story = []
    
    # Header
    story.append(Paragraph("Pre-Blast Safety Checklist", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("AI Blast Safety Assistant — Advisory Document", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Divider line
    divider = Table([[""]], colWidths=[493])
    divider.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#808080')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 12))
    
    # Summary Info Block
    risk_level = submission.get('risk_level', 'GREEN')
    risk_color = RISK_COLORS.get(risk_level, colors.black)
    payload = submission.get('payload', {})
    
    summary_data = [
        [
            Paragraph("Site Name", body_bold_style), Paragraph(submission.get('site_name', ''), body_style),
            Paragraph("Blast ID", body_bold_style), Paragraph(submission.get('blast_id', ''), body_style)
        ],
        [
            Paragraph("Blast Date", body_bold_style), Paragraph(payload.get('blast_date', 'N/A'), body_style),
            Paragraph("Blast Time", body_bold_style), Paragraph(payload.get('blast_time', 'N/A'), body_style)
        ],
        [
            Paragraph("Risk Score", body_bold_style), Paragraph(str(submission.get('total_score', 0)), body_style),
            Paragraph("Risk Level", body_bold_style), Paragraph(f"<font color='{risk_color.hexval()}'><b>{risk_level}</b></font>", body_style)
        ]
    ]
    
    summary_table = Table(summary_data, colWidths=[80, 166, 80, 167])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f9f9f9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#d3d3d3')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d3d3d3')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 15))
    
    # Helper to format boolean inputs
    def bool_str(v):
        if v is True:
            return "OK"
        if v is False:
            return "FAIL"
        return "N/A"

    # Category checks
    sections = [
        {
            "title": "Weather",
            "rows": [
                ["Temperature (°C)", str(payload.get('temperature_c', 'N/A'))],
                ["Rainfall (mm)", str(payload.get('rainfall_mm', 'N/A'))],
                ["Wind Speed (km/h)", str(payload.get('wind_speed_kmh', 'N/A'))],
                ["Lightning Warning", bool_str(not payload.get('lightning_warning'))]
            ]
        },
        {
            "title": "Shift",
            "rows": [
                ["Supervisor Available", bool_str(payload.get('supervisor_available'))],
                ["Blasting Officer Available", bool_str(payload.get('blasting_officer_available'))]
            ]
        },
        {
            "title": "Workforce",
            "rows": [
                ["Worker Count", str(payload.get('worker_count', 'N/A'))],
                ["Workers Outside Exclusion Zone", bool_str(not payload.get('workers_in_exclusion_zone'))],
                ["Safety Briefing Completed", bool_str(payload.get('safety_briefing_completed'))]
            ]
        },
        {
            "title": "Equipment",
            "rows": [
                ["Detonators Secure", bool_str(payload.get('detonators_secure'))],
                ["Siren Working", bool_str(payload.get('siren_working'))],
                ["Communication Working", bool_str(payload.get('communication_working'))],
                ["Emergency Vehicle Available", bool_str(payload.get('emergency_vehicle_available'))]
            ]
        },
        {
            "title": "Site Conditions",
            "rows": [
                ["Exclusion Zone Established", bool_str(payload.get('exclusion_zone_established'))],
                ["Barricades In Place", bool_str(payload.get('barricades_in_place'))],
                ["Blast Design Approved", bool_str(payload.get('blast_design_approved'))],
                ["Escape Route Clear", bool_str(payload.get('escape_route_clear'))]
            ]
        }
    ]

    for section in sections:
        section_story = []
        section_story.append(Paragraph(section["title"], section_title_style))
        
        table_data = []
        for name, value in section["rows"]:
            val_style = body_bold_style if value == "FAIL" else body_style
            val_text = f"<font color='red'><b>{value}</b></font>" if value == "FAIL" else value
            table_data.append([
                Paragraph(name, body_style),
                Paragraph(val_text, val_style)
            ])
            
        t = Table(table_data, colWidths=[280, 213])
        t.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#d3d3d3')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d3d3d3')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ]))
        section_story.append(t)
        section_story.append(Spacer(1, 10))
        story.append(KeepTogether(section_story))

    # Flagged Issues
    issues_story = []
    issues_story.append(Paragraph("Flagged Issues", section_title_style))
    issues = submission.get('issues', [])
    
    if issues:
        headers = [
            Paragraph("<b>Issue</b>", body_bold_style),
            Paragraph("<b>Weight</b>", body_bold_style),
            Paragraph("<b>Critical</b>", body_bold_style)
        ]
        issue_table_data = [headers]
        for issue in issues:
            desc = issue.get('description', '')
            w = str(issue.get('weight', 0))
            crit = "YES" if issue.get('critical') else "no"
            
            desc_text = f"<font color='red'><b>{desc}</b></font>" if issue.get('critical') else desc
            crit_text = f"<font color='red'><b>{crit}</b></font>" if issue.get('critical') else crit
            
            issue_table_data.append([
                Paragraph(desc_text, body_style),
                Paragraph(w, body_style),
                Paragraph(crit_text, body_style)
            ])
            
        issue_table = Table(issue_table_data, colWidths=[353, 70, 70])
        issue_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eeeeee')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#d3d3d3')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d3d3d3')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ]))
        issues_story.append(issue_table)
    else:
        issues_story.append(Paragraph("No issues flagged by the rule engine.", body_style))
        
    issues_story.append(Spacer(1, 10))
    story.append(KeepTogether(issues_story))

    # AI recommendation
    ai_story = []
    ai_story.append(Paragraph("AI-Generated Recommendation (Advisory Only)", section_title_style))
    ai_text = submission.get('ai_recommendation', 'No AI recommendation available.')
    ai_story.append(Paragraph(ai_text.replace("\n", "<br/>"), body_style))
    ai_story.append(Spacer(1, 15))
    story.append(KeepTogether(ai_story))

    # Divider line
    story.append(divider)
    story.append(Spacer(1, 10))

    # Authorised Officer Sign-Off Block
    officer_decision = submission.get('officer_decision') or 'PENDING'
    officer_name = submission.get('officer_name') or '____________________'
    officer_comments = submission.get('officer_comments') or ''
    
    # Render digital signature image if base64 data exists
    signature_flowable = Paragraph("____________________", body_style)
    sig_b64 = submission.get('digital_signature')
    if sig_b64 and sig_b64.startswith("data:image/"):
        try:
            # Decode b64 signature
            header, encoded = sig_b64.split(",", 1)
            sig_data = base64.b64decode(encoded)
            sig_io = io.BytesIO(sig_data)
            # Create a Reportlab image object - resize signature
            signature_flowable = Image(sig_io, width=1.5*inch, height=0.5*inch)
        except Exception:
            pass

    signoff_data = [
        [Paragraph("<b>Decision</b>", body_bold_style), Paragraph(officer_decision, body_bold_style)],
        [Paragraph("<b>Officer Name</b>", body_bold_style), Paragraph(officer_name, body_style)],
        [Paragraph("<b>Comments</b>", body_bold_style), Paragraph(officer_comments, body_style)],
        [Paragraph("<b>Signature</b>", body_bold_style), signature_flowable],
        [Paragraph("<b>Date</b>", body_bold_style), Paragraph(submission.get('reviewed_at') or '____________________', body_style)]
    ]
    
    signoff_table = Table(signoff_data, colWidths=[100, 393])
    signoff_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#d3d3d3')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d3d3d3')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    
    signoff_story = []
    signoff_story.append(Paragraph("Authorised Blasting Officer Sign-Off", section_title_style))
    signoff_story.append(signoff_table)
    signoff_story.append(Spacer(1, 15))
    story.append(KeepTogether(signoff_story))

    # Audit Hash + Disclaimer Footer
    integrity_hash = generate_integrity_hash(submission)
    
    disclaimer_text = (
        f"<b>INTEGRITY HASH:</b> {integrity_hash}<br/><br/>"
        f"DISCLAIMER: This document is generated by a student prototype application for "
        f"learning and demonstration purposes only. It is a decision-support aid and does "
        f"NOT constitute blast approval. All operational use requires review and sign-off "
        f"by an appropriately qualified and authorised blasting professional in accordance "
        f"with applicable laws and site safety standards. Generated: {datetime.utcnow().isoformat()}Z"
    )
    
    footer_story = []
    footer_story.append(divider)
    footer_story.append(Spacer(1, 6))
    footer_story.append(Paragraph(disclaimer_text, disclaimer_style))
    story.append(KeepTogether(footer_story))
    
    # Build Document
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
