"""
Export Service - Generate Word and PDF documents from reports.
"""

import os
import io
from datetime import datetime
from typing import Optional

from docx import Document
from docx.shared import Inches, Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# WeasyPrint for PDF (optional)
try:
    from weasyprint import HTML, CSS
    HAS_WEASYPRINT = True
except ImportError:
    HAS_WEASYPRINT = False


def set_rtl_document(doc: Document):
    """Set document to RTL for Arabic."""
    for section in doc.sections:
        sectPr = section._sectPr
        bidi = OxmlElement('w:bidi')
        bidi.set(qn('w:val'), '1')
        sectPr.append(bidi)


def create_rtl_paragraph(doc: Document, text: str, style: str = None):
    """Create RTL paragraph."""
    p = doc.add_paragraph(text, style=style)
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    # Set RTL
    pPr = p._element.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    pPr.append(bidi)
    return p


def set_arabic_font(run, font_name: str = 'Arial', size: int = 12):
    """Set Arabic font for a run."""
    run.font.name = font_name
    run.font.size = Pt(size)
    r = run._element
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:cs'), font_name)
    rFonts.set(qn('w:ascii'), font_name)
    rFonts.set(qn('w:hAnsi'), font_name)
    r.get_or_add_rPr().append(rFonts)


def export_to_word(report) -> io.BytesIO:
    """
    Export report to Word document.
    
    Args:
        report: Report model instance
    
    Returns:
        BytesIO object containing the Word document
    """
    doc = Document()
    
    # Set RTL
    set_rtl_document(doc)
    
    # Set margins
    for section in doc.sections:
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)
    
    # Title
    title = doc.add_heading(report.title, level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in title.runs:
        set_arabic_font(run, 'Arial', 24)
    
    # Organization and period
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    org_name = report.organization.name if report.organization else 'جامعة البترا'
    run = subtitle.add_run(f'{org_name}\n{report.period_display}')
    set_arabic_font(run, 'Arial', 14)
    
    doc.add_paragraph()  # Spacer
    
    # Sections
    for section in report.sections.all().order_by('order'):
        # Section heading
        heading = doc.add_heading(section.title, level=1)
        heading.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        for run in heading.runs:
            set_arabic_font(run, 'Arial', 18)
        
        # Section content
        if section.content:
            # Split by paragraphs
            paragraphs = section.content.split('\n\n')
            for para_text in paragraphs:
                if para_text.strip():
                    p = create_rtl_paragraph(doc, para_text.strip())
                    for run in p.runs:
                        set_arabic_font(run, 'Arial', 12)
        
        # Add images if any
        for image in section.images.all():
            if image.image and os.path.exists(image.image.path):
                doc.add_picture(image.image.path, width=Inches(5))
                last_paragraph = doc.paragraphs[-1]
                last_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                
                if image.caption:
                    caption = create_rtl_paragraph(doc, image.caption)
                    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for run in caption.runs:
                        set_arabic_font(run, 'Arial', 10)
        
        doc.add_paragraph()  # Spacer between sections
    
    # Footer - Generated date
    footer_text = f'تم التوليد بتاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}'
    footer = create_rtl_paragraph(doc, footer_text)
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in footer.runs:
        set_arabic_font(run, 'Arial', 10)
    
    # Save to BytesIO
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return buffer


def export_to_pdf(report) -> Optional[io.BytesIO]:
    """
    Export report to PDF.
    
    Args:
        report: Report model instance
    
    Returns:
        BytesIO object containing the PDF, or None if WeasyPrint not available
    """
    if not HAS_WEASYPRINT:
        return None
    
    # Generate HTML
    html_content = generate_report_html(report)
    
    # CSS for RTL Arabic
    css = CSS(string='''
        @page {
            size: A4;
            margin: 2.5cm;
        }
        body {
            font-family: 'Arial', 'Tahoma', sans-serif;
            direction: rtl;
            text-align: right;
            line-height: 1.8;
            font-size: 12pt;
        }
        h1 {
            text-align: center;
            font-size: 24pt;
            margin-bottom: 0.5cm;
        }
        h2 {
            font-size: 18pt;
            margin-top: 1cm;
            border-bottom: 2px solid #333;
            padding-bottom: 0.3cm;
        }
        h3 {
            font-size: 14pt;
            margin-top: 0.5cm;
        }
        .subtitle {
            text-align: center;
            font-size: 14pt;
            margin-bottom: 1cm;
        }
        .section {
            margin-bottom: 1cm;
        }
        .image-container {
            text-align: center;
            margin: 1cm 0;
        }
        .image-container img {
            max-width: 80%;
            height: auto;
        }
        .caption {
            text-align: center;
            font-size: 10pt;
            color: #666;
            margin-top: 0.3cm;
        }
        .footer {
            text-align: center;
            font-size: 10pt;
            color: #999;
            margin-top: 2cm;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1cm 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: right;
        }
        th {
            background-color: #f5f5f5;
        }
    ''')
    
    # Generate PDF
    buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(buffer, stylesheets=[css])
    buffer.seek(0)
    
    return buffer


def generate_report_html(report) -> str:
    """Generate HTML content for the report."""
    org_name = report.organization.name if report.organization else 'جامعة البترا'
    
    sections_html = ''
    for section in report.sections.all().order_by('order'):
        content = section.content.replace('\n', '<br>') if section.content else ''
        
        images_html = ''
        for image in section.images.all():
            if image.image:
                images_html += f'''
                <div class="image-container">
                    <img src="file://{image.image.path}" alt="{image.caption or 'صورة'}">
                    {f'<p class="caption">{image.caption}</p>' if image.caption else ''}
                </div>
                '''
        
        sections_html += f'''
        <div class="section">
            <h2>{section.title}</h2>
            <p>{content}</p>
            {images_html}
        </div>
        '''
    
    html = f'''
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>{report.title}</title>
    </head>
    <body>
        <h1>{report.title}</h1>
        <p class="subtitle">{org_name}<br>{report.period_display}</p>
        
        {sections_html}
        
        <p class="footer">تم التوليد بتاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}</p>
    </body>
    </html>
    '''
    
    return html


def get_export_filename(report, format_type: str = 'docx') -> str:
    """Generate filename for export."""
    title_slug = report.title.replace(' ', '_')[:50]
    date_str = datetime.now().strftime('%Y%m%d')
    return f'{title_slug}_{date_str}.{format_type}'


# ============================================
# Project-based export (New System)
# ============================================

def export_project_to_word(project, generated_report=None, progress_callback=None) -> io.BytesIO:
    """
    Export project to Word document using professional template.
    
    Args:
        project: Project model instance
        generated_report: GeneratedReport instance for progress tracking
        progress_callback: Optional callback function(progress, step)
    
    Returns:
        BytesIO object containing the Word document
    """
    from .report_template import generate_professional_report
    return generate_professional_report(project, generated_report)


def export_project_to_pdf(project, generated_report=None, progress_callback=None) -> Optional[io.BytesIO]:
    """
    Export project to PDF.
    
    Args:
        project: Project model instance
        generated_report: GeneratedReport instance for progress tracking
        progress_callback: Optional callback function(progress, step)
    
    Returns:
        BytesIO object containing the PDF, or None if WeasyPrint not available
    """
    if not HAS_WEASYPRINT:
        return None
    
    def update_progress(percent, step):
        if generated_report:
            generated_report.progress = percent
            generated_report.current_step = step
            generated_report.save(update_fields=['progress', 'current_step'])
        if progress_callback:
            progress_callback(percent, step)
    
    update_progress(10, 'تجهيز البيانات')
    
    # Generate HTML
    html_content = generate_project_html(project, update_progress)
    
    update_progress(80, 'تحويل إلى PDF')
    
    # CSS for RTL Arabic
    css = CSS(string='''
        @page {
            size: A4;
            margin: 2.5cm;
        }
        body {
            font-family: 'Arial', 'Tahoma', sans-serif;
            direction: rtl;
            text-align: right;
            line-height: 1.8;
            font-size: 12pt;
        }
        h1 { text-align: center; font-size: 24pt; margin-bottom: 0.5cm; }
        h2 { font-size: 18pt; margin-top: 1cm; border-bottom: 2px solid #333; padding-bottom: 0.3cm; }
        h3 { font-size: 14pt; margin-top: 0.5cm; color: #444; }
        .subtitle { text-align: center; font-size: 14pt; margin-bottom: 1cm; }
        .value { font-size: 16pt; color: #0066cc; font-weight: bold; margin: 0.5cm 0; }
        .unit { font-size: 12pt; color: #666; }
        .footer { text-align: center; font-size: 10pt; color: #999; margin-top: 2cm; page-break-before: always; }
    ''')
    
    # Generate PDF
    buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(buffer, stylesheets=[css])
    buffer.seek(0)
    
    update_progress(100, 'اكتمل')
    
    return buffer


def generate_pie_chart_css(data: list, title: str, chart_id: str = "1") -> str:
    """
    Generate CSS-based pie chart HTML.
    
    Args:
        data: List of dicts with 'label', 'value', 'color' (optional)
        title: Chart title
        chart_id: Unique identifier for the chart
    
    Returns:
        HTML string for the pie chart
    """
    # Default colors
    colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
    
    total = sum(item.get('value', 0) for item in data)
    if total == 0:
        return f'<div class="chart-container"><p>لا توجد بيانات</p></div>'
    
    # Calculate angles
    current_angle = 0
    gradient_parts = []
    legend_items = []
    
    for i, item in enumerate(data):
        value = item.get('value', 0)
        percentage = (value / total) * 100
        angle = (value / total) * 360
        color = item.get('color', colors[i % len(colors)])
        label = item.get('label', f'عنصر {i+1}')
        
        end_angle = current_angle + angle
        gradient_parts.append(f'{color} {current_angle}deg {end_angle}deg')
        current_angle = end_angle
        
        legend_items.append(f'''
            <div class="legend-item">
                <div class="legend-color" style="background: {color};"></div>
                <span>{label} {percentage:.1f}%</span>
            </div>
        ''')
    
    gradient = ', '.join(gradient_parts)
    legend_html = '\n'.join(legend_items)
    
    return f'''
    <div class="chart-container">
        <div class="chart-title">{title}</div>
        <div class="pie-chart" style="background: conic-gradient({gradient});"></div>
        <div class="legend">
            {legend_html}
        </div>
    </div>
    '''


def generate_bar_chart_css(data: list, title: str, chart_id: str = "1", max_height: int = 200) -> str:
    """
    Generate CSS-based bar chart HTML.
    
    Args:
        data: List of dicts with 'label', 'value', 'color' (optional)
        title: Chart title
        chart_id: Unique identifier
        max_height: Maximum bar height in pixels
    
    Returns:
        HTML string for the bar chart
    """
    colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    
    if not data:
        return f'<div class="chart-container"><p>لا توجد بيانات</p></div>'
    
    max_value = max(item.get('value', 0) for item in data)
    if max_value == 0:
        max_value = 1
    
    bars_html = ''
    for i, item in enumerate(data):
        value = item.get('value', 0)
        height = int((value / max_value) * max_height)
        color = item.get('color', colors[i % len(colors)])
        label = item.get('label', '')
        
        bars_html += f'''
            <div class="bar-group">
                <div class="bar-value">{value:,}</div>
                <div class="bar" style="height: {height}px; background: {color};"></div>
                <div class="bar-label">{label}</div>
            </div>
        '''
    
    return f'''
    <div class="chart-container bar-chart-container">
        <div class="chart-title">{title}</div>
        <div class="bar-chart">
            {bars_html}
        </div>
    </div>
    '''


def generate_line_chart_css(data: list, title: str, chart_id: str = "1") -> str:
    """
    Generate CSS-based line chart HTML (using SVG).
    
    Args:
        data: List of dicts with 'label', 'value'
        title: Chart title
        chart_id: Unique identifier
    
    Returns:
        HTML string for the line chart
    """
    if not data or len(data) < 2:
        return f'<div class="chart-container"><p>لا توجد بيانات كافية</p></div>'
    
    width = 600
    height = 250
    padding = 50
    
    values = [item.get('value', 0) for item in data]
    max_val = max(values) if values else 1
    min_val = min(values) if values else 0
    range_val = max_val - min_val if max_val != min_val else 1
    
    # Calculate points
    points = []
    x_step = (width - 2 * padding) / (len(data) - 1)
    for i, item in enumerate(data):
        x = padding + i * x_step
        y = height - padding - ((item.get('value', 0) - min_val) / range_val) * (height - 2 * padding)
        points.append((x, y))
    
    # Create SVG path
    path_d = f"M {points[0][0]} {points[0][1]}"
    for x, y in points[1:]:
        path_d += f" L {x} {y}"
    
    # Create circles and labels
    circles_html = ''
    labels_html = ''
    for i, ((x, y), item) in enumerate(zip(points, data)):
        circles_html += f'<circle cx="{x}" cy="{y}" r="5" fill="#3b82f6"/>'
        labels_html += f'<text x="{x}" y="{height - 10}" text-anchor="middle" class="x-label">{item.get("label", "")}</text>'
    
    return f'''
    <div class="chart-container">
        <div class="chart-title">{title}</div>
        <svg viewBox="0 0 {width} {height}" class="line-chart-svg">
            <path d="{path_d}" fill="none" stroke="#3b82f6" stroke-width="3"/>
            {circles_html}
            {labels_html}
        </svg>
    </div>
    '''


def generate_table_html(data: dict, title: str = None) -> str:
    """
    Generate HTML table from data structure.
    
    Args:
        data: Dict with 'headers' (list) and 'rows' (list of lists)
        title: Optional table title
    
    Returns:
        HTML string for the table
    """
    if not data or 'rows' not in data:
        return ''
    
    headers = data.get('headers', [])
    rows = data.get('rows', [])
    
    title_html = f'<div class="table-title">{title}</div>' if title else ''
    
    header_html = ''
    if headers:
        header_cells = ''.join(f'<th>{h}</th>' for h in headers)
        header_html = f'<thead><tr>{header_cells}</tr></thead>'
    
    rows_html = ''
    for i, row in enumerate(rows):
        row_class = ''
        if isinstance(row, dict):
            row_class = row.get('class', '')
            cells = row.get('cells', [])
        else:
            cells = row
        
        cells_html = ''.join(f'<td>{cell}</td>' for cell in cells)
        rows_html += f'<tr class="{row_class}">{cells_html}</tr>'
    
    return f'''
    {title_html}
    <table>
        {header_html}
        <tbody>
            {rows_html}
        </tbody>
    </table>
    '''


def get_report_css() -> str:
    """Get the full CSS for professional Arabic reports."""
    return '''
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        * { box-sizing: border-box; }
        
        body {
            font-family: 'Cairo', 'Traditional Arabic', sans-serif;
            font-size: 16px;
            line-height: 1.8;
            max-width: 850px;
            margin: 40px auto;
            padding: 20px;
            direction: rtl;
            background: #fff;
            color: #333;
        }
        
        h1 {
            text-align: center;
            color: #1a365d;
            font-size: 28px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
            font-weight: 700;
        }
        
        h2 {
            color: #2563eb;
            font-size: 20px;
            margin-top: 30px;
            font-weight: 600;
        }
        
        h3 {
            color: #1a365d;
            font-size: 18px;
            margin-top: 20px;
            font-weight: 600;
        }
        
        p {
            text-align: justify;
            margin: 15px 0;
        }
        
        .subtitle {
            text-align: center;
            color: #666;
            font-size: 18px;
        }
        
        strong { color: #1a365d; }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        
        th, td {
            border: 1px solid #333;
            padding: 8px 10px;
            text-align: center;
        }
        
        th {
            background: #2563eb;
            color: white;
            font-weight: 600;
        }
        
        tr:nth-child(even) { background: #f0f4f8; }
        
        tr.total-row { 
            font-weight: bold; 
            background: #1a365d !important; 
            color: white;
        }
        
        tr.highlight-row {
            background: #dbeafe;
            font-weight: 600;
        }
        
        .table-title {
            font-weight: 700;
            margin: 30px 0 15px;
            font-size: 16px;
            color: #1a365d;
            text-align: center;
        }
        
        /* Charts */
        .chart-container {
            text-align: center;
            margin: 40px 0;
        }
        
        .chart-title {
            font-weight: 700;
            margin-bottom: 20px;
            font-size: 18px;
            color: #1a365d;
        }
        
        /* Pie Chart */
        .pie-chart {
            width: 280px;
            height: 280px;
            border-radius: 50%;
            margin: 0 auto 20px;
            position: relative;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .pie-chart::before {
            content: '';
            position: absolute;
            width: 100px;
            height: 100px;
            background: white;
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .legend {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 20px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }
        
        /* Bar Chart */
        .bar-chart-container {
            padding: 20px;
        }
        
        .bar-chart {
            display: flex;
            justify-content: center;
            align-items: flex-end;
            gap: 30px;
            height: 250px;
            border-bottom: 2px solid #333;
            padding: 0 20px;
        }
        
        .bar-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        }
        
        .bar {
            width: 50px;
            border-radius: 4px 4px 0 0;
            transition: height 0.3s ease;
        }
        
        .bar-value {
            font-weight: 600;
            font-size: 14px;
            color: #1a365d;
        }
        
        .bar-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        
        /* Line Chart */
        .line-chart-svg {
            width: 100%;
            max-width: 600px;
            height: auto;
        }
        
        .line-chart-svg .x-label {
            font-size: 12px;
            fill: #666;
        }
        
        /* Section */
        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        
        .item {
            margin: 20px 0;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border-right: 4px solid #2563eb;
        }
        
        .value {
            font-size: 18px;
            color: #0066cc;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .unit {
            font-size: 14px;
            color: #666;
        }
        
        .footer {
            text-align: center;
            font-size: 12pt;
            color: #999;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
        
        @media print {
            body { margin: 0; padding: 20px; }
            .pie-chart, tr.total-row {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    '''


def generate_project_html(project, progress_callback=None) -> str:
    """Generate professional HTML content for the project report."""
    from apps.reports.models import ItemDraft, AxisDraft
    from apps.data_collection.models import DataCollectionPeriod
    
    org_name = project.organization.name if project.organization else ''
    
    # Find the data collection period for this project
    data_period = DataCollectionPeriod.objects.filter(
        template=project.template,
        organization=project.organization,
        academic_year=project.period
    ).first()
    
    axes = project.template.axes.all().prefetch_related('items')
    total_axes = axes.count()
    
    sections_html = ''
    for i, axis in enumerate(axes):
        if progress_callback:
            progress = 10 + int((i / total_axes) * 60)
            progress_callback(progress, f'معالجة محور: {axis.name}')
        
        # Get axis draft for axis-level content
        axis_draft = None
        if data_period:
            axis_draft = AxisDraft.objects.filter(
                period=data_period,
                axis=axis
            ).first()
        
        items_html = ''
        for item in axis.items.all().order_by('order'):
            # Get item draft
            item_draft = None
            if data_period:
                item_draft = ItemDraft.objects.filter(
                    period=data_period,
                    item=item
                ).first()
            
            if not item_draft:
                continue
            
            item_html = f'<div class="item"><h3>{item.code}: {item.name}</h3>'
            
            # Add text content
            if item_draft.content:
                item_html += f'<p>{item_draft.content}</p>'
            
            # Add chart if available
            if item_draft.chart_config:
                chart_config = item_draft.chart_config
                chart_type = chart_config.get('type', 'pie')
                chart_data = chart_config.get('data', [])
                chart_title = chart_config.get('title', '')
                
                if chart_type == 'pie':
                    item_html += generate_pie_chart_css(chart_data, chart_title, item.code)
                elif chart_type == 'bar':
                    item_html += generate_bar_chart_css(chart_data, chart_title, item.code)
                elif chart_type == 'line':
                    item_html += generate_line_chart_css(chart_data, chart_title, item.code)
            
            # Add table if available
            if item_draft.table_data:
                table_data = item_draft.table_data
                # Handle both list format (rows only) and dict format (headers + rows)
                if isinstance(table_data, list) and table_data:
                    # Convert list of dicts to headers + rows format
                    if isinstance(table_data[0], dict):
                        headers = list(table_data[0].keys())
                        rows = [[row.get(h, '') for h in headers] for row in table_data]
                        table_data = {'headers': headers, 'rows': rows}
                    else:
                        # List of lists, first row is headers
                        table_data = {'headers': table_data[0], 'rows': table_data[1:]}
                
                table_title = table_data.get('title', '') if isinstance(table_data, dict) else ''
                item_html += generate_table_html(table_data, table_title)
            
            # Add manual content if available
            if item_draft.manual_content:
                item_html += f'<div class="manual-content">{item_draft.manual_content}</div>'
            
            item_html += '</div>'
            items_html += item_html
        
        if items_html or (axis_draft and axis_draft.content):
            axis_content = ''
            if axis_draft and axis_draft.content:
                axis_content = f'<p>{axis_draft.content}</p>'
            
            sections_html += f'''
            <div class="section">
                <h2>{axis.code}. {axis.name}</h2>
                {axis_content}
                {items_html}
            </div>
            '''
    
    css = get_report_css()
    
    html = f'''
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>{project.name}</title>
        <style>{css}</style>
    </head>
    <body>
        <h1>{project.name}</h1>
        <p class="subtitle">{org_name}<br>{project.period}</p>
        
        {sections_html}
        
        <p class="footer">تم توليد هذا التقرير بتاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}</p>
    </body>
    </html>
    '''
    
    return html


def get_project_export_filename(project, format_type: str = 'docx') -> str:
    """Generate filename for project export."""
    title_slug = project.name.replace(' ', '_')[:50]
    date_str = datetime.now().strftime('%Y%m%d')
    return f'{title_slug}_{date_str}.{format_type}'
