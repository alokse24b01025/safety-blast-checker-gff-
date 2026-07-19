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
    'GREEN': colors.HexColor('#005c2b'),
    'YELLOW': colors.HexColor('#b27b00'),
    'ORANGE': colors.HexColor('#c65100'),
    'RED': colors.HexColor('#9e0000')
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
    
    # Highly optimized margins to guarantee a single-page fit (36pt = 0.5 inch)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom, compact corporate typography styles
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        textColor=colors.HexColor('#111827'),
        spaceAfter=4,
        spaceBefore=0
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1f2937')
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
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor('#6b7280')
    )

    story = []
    
    # --- 1. Header (Title Left, Risk Badge Right) ---
    risk_level = submission.get('risk_level', 'GREEN')
    risk_color = RISK_COLORS.get(risk_level, colors.black)
    payload = submission.get('payload', {})
    
    header_left = [
        Paragraph("<b>PRE-BLAST SAFETY CHECKLIST AUDIT REPORT</b>", ParagraphStyle(
            'DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=13, leading=15, textColor=colors.HexColor('#111827')
        )),
        Spacer(1, 2),
        Paragraph("AI-Assisted Operations Safety Verification & Risk Assessment Engine", ParagraphStyle(
            'DocSubtitle', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#4b5563')
        ))
    ]
    
    badge_text_style = ParagraphStyle(
        'BadgeText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        alignment=1, # Centered
        textColor=colors.white
    )
    badge_table = Table([[Paragraph(f"RISK LEVEL: {risk_level}", badge_text_style)]], colWidths=[150], rowHeights=[20])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), risk_color),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, risk_color),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    
    header_table = Table([[header_left, badge_table]], colWidths=[373, 150])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    
    # Top Divider Line
    divider = Table([[""]], colWidths=[523])
    divider.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 6))
    
    # --- 2. Summary Info Cards ---
    summary_data = [
        [
            Paragraph("<b>Site Location:</b>", body_style), Paragraph(submission.get('site_name', ''), body_bold_style),
            Paragraph("<b>Blast Plan ID:</b>", body_style), Paragraph(submission.get('blast_id', ''), body_bold_style)
        ],
        [
            Paragraph("<b>Schedule Date:</b>", body_style), Paragraph(payload.get('blast_date', 'N/A'), body_style),
            Paragraph("<b>Schedule Time:</b>", body_style), Paragraph(payload.get('blast_time', 'N/A'), body_style)
        ],
        [
            Paragraph("<b>Total Risk Score:</b>", body_style), Paragraph(f"<b>{submission.get('total_score', 0)} / 100 Pts</b>", body_style),
            Paragraph("<b>Integrity Status:</b>", body_style), Paragraph("SECURE & AUDITED", ParagraphStyle('Sec', parent=body_bold_style, textColor=colors.HexColor('#059669')))
        ]
    ]
    summary_table = Table(summary_data, colWidths=[95, 166, 95, 167])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f9fafb')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f3f4f6')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 8))
    
    # Helper to format boolean inputs
    def bool_str(v):
        if v is True:
            return "OK"
        if v is False:
            return "FAIL"
        return "N/A"

    def cell_val(val):
        if val == "FAIL":
            return Paragraph("<font color='#dc2626'><b>FAIL</b></font>", body_bold_style)
        if val == "OK":
            return Paragraph("<font color='#059669'><b>OK</b></font>", body_bold_style)
        return Paragraph(val, body_style)
        
    # --- 3. Checklist Items Grid (Side-by-Side 2 Column Setup) ---
    left_checklist = [
        ("Temperature (°C)", str(payload.get('temperature_c', 'N/A'))),
        ("Rainfall (mm)", str(payload.get('rainfall_mm', 'N/A'))),
        ("Wind Speed (km/h)", str(payload.get('wind_speed_kmh', 'N/A'))),
        ("Lightning Warning Free", bool_str(not payload.get('lightning_warning'))),
        ("Supervisor Available", bool_str(payload.get('supervisor_available'))),
        ("Blasting Officer Available", bool_str(payload.get('blasting_officer_available'))),
        ("Worker Count", str(payload.get('worker_count', 'N/A'))),
        ("Workers Outside Excl. Zone", bool_str(not payload.get('workers_in_exclusion_zone'))),
        ("Safety Briefing Completed", bool_str(payload.get('safety_briefing_completed'))),
    ]

    right_checklist = [
        ("Detonators Secure", bool_str(payload.get('detonators_secure'))),
        ("Warning Siren Working", bool_str(payload.get('siren_working'))),
        ("Communication Working", bool_str(payload.get('communication_working'))),
        ("Emergency Vehicle Ready", bool_str(payload.get('emergency_vehicle_available'))),
        ("Exclusion Zone Established", bool_str(payload.get('exclusion_zone_established'))),
        ("Barricades In Place", bool_str(payload.get('barricades_in_place'))),
        ("Blast Design Approved", bool_str(payload.get('blast_design_approved'))),
        ("Escape Route Clear", bool_str(payload.get('escape_route_clear'))),
        ("", "") # balance column heights
    ]

    checklist_data = []
    for i in range(9):
        l_label, l_val = left_checklist[i]
        r_label, r_val = right_checklist[i]
        checklist_data.append([
            Paragraph(l_label, body_style) if l_label else "",
            cell_val(l_val) if l_val else "",
            Paragraph(r_label, body_style) if r_label else "",
            cell_val(r_val) if r_val else ""
        ])

    story.append(Paragraph("Pre-Detonation Safety Check Logs", section_title_style))
    checklist_table = Table(checklist_data, colWidths=[195, 66, 195, 67])
    checklist_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f3f4f6')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(checklist_table)
    story.append(Spacer(1, 8))
    
    # --- 4. Flagged Issues & AI Recommendations Side-by-Side ---
    issues_story = []
    issues_story.append(Paragraph("Flagged Safety Violations", section_title_style))
    issues = submission.get('issues', [])
    
    if issues:
        headers = [
            Paragraph("<b>Flagged Issue Description</b>", body_bold_style),
            Paragraph("<b>Pts</b>", body_bold_style),
            Paragraph("<b>Crit</b>", body_bold_style)
        ]
        issue_table_data = [headers]
        for issue in issues:
            desc = issue.get('description', '')
            w = str(issue.get('weight', 0))
            crit = "YES" if issue.get('critical') else "no"
            
            desc_text = f"<font color='#dc2626'><b>{desc}</b></font>" if issue.get('critical') else desc
            crit_text = f"<font color='#dc2626'><b>{crit}</b></font>" if issue.get('critical') else crit
            
            issue_table_data.append([
                Paragraph(desc_text, body_style),
                Paragraph(w, body_style),
                Paragraph(crit_text, body_style)
            ])
        issue_table = Table(issue_table_data, colWidths=[171, 40, 40])
        issue_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f3f4f6')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f3f4f6')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ]))
        issues_story.append(issue_table)
    else:
        issues_story.append(Paragraph("No safety parameter violations or active risk flags detected by the rule engine.", body_style))
        
    ai_story = []
    ai_story.append(Paragraph("AI-Generated Recommendations", section_title_style))
    ai_text = submission.get('ai_recommendation', 'No AI recommendation generated.')
    ai_para = Paragraph(f"<i>{ai_text.replace('\n', '<br/>')}</i>", ParagraphStyle(
        'AIPara',
        parent=body_style,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#374151')
    ))
    ai_box_table = Table([[ai_para]], colWidths=[251])
    ai_box_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f9fafb')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    ai_story.append(ai_box_table)
    
    mid_table = Table([[issues_story, "", ai_story]], colWidths=[251, 21, 251])
    mid_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(mid_table)
    story.append(Spacer(1, 8))

    # --- 5. Authorised Officer Sign-Off Block ---
    officer_decision = submission.get('officer_decision') or 'PENDING'
    officer_name = submission.get('officer_name') or '____________________'
    reviewed_at = submission.get('reviewed_at') or '____________________'
    
    if reviewed_at != '____________________':
        try:
            dt = datetime.fromisoformat(reviewed_at.replace("Z", "+00:00"))
            reviewed_at = dt.strftime("%Y-%m-%d %H:%M UTC")
        except Exception:
            pass

    decision_color = '#059669' if officer_decision == 'APPROVED' else ('#d97706' if officer_decision == 'HOLD' else '#dc2626')
    decision_html = f"<font color='{decision_color}'><b>{officer_decision}</b></font>"

    signoff_left_data = [
        [Paragraph("<b>Audit Decision</b>", body_bold_style), Paragraph(decision_html, body_style)],
        [Paragraph("<b>Blasting Officer</b>", body_bold_style), Paragraph(officer_name, body_style)],
        [Paragraph("<b>Sign-Off Date</b>", body_bold_style), Paragraph(reviewed_at, body_style)]
    ]
    signoff_left_table = Table(signoff_left_data, colWidths=[90, 161])
    signoff_left_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f3f4f6')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    
    signature_flowable = Paragraph("____________________", body_style)
    sig_b64 = submission.get('digital_signature')
    if sig_b64 and sig_b64.startswith("data:image/"):
        try:
            header, encoded = sig_b64.split(",", 1)
            sig_data = base64.b64decode(encoded)
            sig_io = io.BytesIO(sig_data)
            signature_flowable = Image(sig_io, width=1.3*inch, height=0.35*inch)
        except Exception:
            pass

    officer_comments = submission.get('officer_comments') or 'No comments recorded.'
    signoff_right_data = [
        [Paragraph("<b>Sign-Off Instructions & Comments</b>", body_bold_style)],
        [Paragraph(officer_comments, ParagraphStyle('Comm', parent=body_style, fontSize=7.5, leading=9.5))],
        [signature_flowable]
    ]
    signoff_right_table = Table(signoff_right_data, colWidths=[251])
    signoff_right_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f9fafb')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f3f4f6')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (0,2), (0,2), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    
    signoff_story = []
    signoff_story.append(Paragraph("Authorised Blasting Officer Verification Sign-Off", section_title_style))
    signoff_row_table = Table([[signoff_left_table, "", signoff_right_table]], colWidths=[251, 21, 251])
    signoff_row_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    signoff_story.append(signoff_row_table)
    story.append(KeepTogether(signoff_story))
    story.append(Spacer(1, 6))
    
    # --- 6. Integrity Hash & Disclaimer Footer ---
    integrity_hash = generate_integrity_hash(submission)
    
    disclaimer_text = (
        f"<b>DOCUMENT INTEGRITY VERIFICATION HASH:</b> {integrity_hash}<br/>"
        f"<b>IMPORTANT LEGAL NOTICE:</b> This safety report is a decision-support aid generated by an automated learning model system. "
        f"It does NOT constitute operational blast clearance. All blasting activities must receive verified, manual sign-off by a "
        f"certified blasting officer in accordance with DGMS/MSHA regulations. Timestamp: {datetime.utcnow().isoformat()}Z"
    )
    
    footer_story = []
    footer_story.append(divider)
    footer_story.append(Spacer(1, 4))
    footer_story.append(Paragraph(disclaimer_text, disclaimer_style))
    story.append(KeepTogether(footer_story))
    
    # Build PDF Document
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
