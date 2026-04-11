"""
Full Report Generator - Generate complete annual report as single document.
"""

import os
import io
from pathlib import Path
from datetime import datetime
from typing import Optional

from docx import Document
from docx.shared import Cm, Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

from .chart_generator import generate_chart_image


class FullReportGenerator:
    """
    Generate complete annual report as single Word document.
    
    Usage:
        generator = FullReportGenerator(project)
        doc_path = generator.generate()
    """
    
    def __init__(self, project, output_dir: str = "./output"):
        self.project = project
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.doc = None
        self.stats = {
            'axes': 0,
            'items': 0,
            'texts': 0,
            'tables': 0,
            'figures': 0,
        }
    
    def generate(self, include_toc: bool = True, formats: str = 'all') -> dict:
        """
        Generate full report document.
        
        Args:
            formats: 'html', 'docx', or 'all'
        
        Returns:
            Dict with paths: {'html': '...', 'docx': '...'}
        """
        from apps.templates_app.models import Axis, Item, ItemComponent
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M')
        results = {}
        
        # Collect all content first
        self.content = []
        axes = Axis.objects.all().order_by('order')
        
        for axis in axes:
            self.stats['axes'] += 1
            axis_content = {'type': 'axis', 'data': axis, 'items': []}
            
            items = Item.objects.filter(axis=axis).order_by('code')
            for item in items:
                self.stats['items'] += 1
                components = ItemComponent.objects.filter(item=item).order_by('order')
                axis_content['items'].append({
                    'item': item,
                    'components': list(components)
                })
            
            self.content.append(axis_content)
        
        # Generate HTML
        if formats in ('html', 'all'):
            html_path = self.output_dir / f"التقرير_السنوي_{timestamp}.html"
            self._generate_html(html_path)
            results['html'] = str(html_path)
        
        # Generate DOCX
        if formats in ('docx', 'all'):
            self.doc = Document()
            self._setup_document()
            self._add_title_page()
            if include_toc:
                self._add_toc_placeholder()
            
            for axis_content in self.content:
                self._add_axis(axis_content['data'])
                for item_data in axis_content['items']:
                    self._add_item_from_data(item_data)
            
            docx_path = self.output_dir / f"التقرير_السنوي_{timestamp}.docx"
            self.doc.save(str(docx_path))
            results['docx'] = str(docx_path)
        
        return results
    
    def _generate_html(self, output_path: Path):
        """Generate full report as HTML."""
        html = '''<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>التقرير السنوي - جامعة البترا 2023-2024</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl;
            padding: 40px;
            max-width: 1000px;
            margin: 0 auto;
            line-height: 1.8;
            color: #333;
            background: #f9f9f9;
        }
        .report { background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .title-page { text-align: center; padding: 100px 0; border-bottom: 3px solid #1a5f7a; margin-bottom: 40px; }
        .title-page h1 { color: #1a5f7a; font-size: 2.5em; margin: 20px 0; }
        .title-page h2 { color: #333; font-size: 2em; }
        .axis { margin: 40px 0; padding-top: 30px; border-top: 2px solid #1a5f7a; }
        .axis-title { color: #1a5f7a; font-size: 1.5em; margin-bottom: 20px; }
        .item { margin: 30px 0; padding: 20px; background: #fafafa; border-radius: 8px; }
        .item-title { color: #2c3e50; font-size: 1.2em; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .text { margin: 15px 0; text-align: justify; }
        .table-container { margin: 20px 0; overflow-x: auto; }
        .table-title { font-weight: bold; text-align: center; margin-bottom: 10px; color: #1a5f7a; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
        th { background: #1a5f7a; color: white; }
        tr:nth-child(even) { background: #f5f5f5; }
        .figure { text-align: center; margin: 20px 0; }
        .figure img { max-width: 100%; border-radius: 8px; }
        .figure-title { font-style: italic; color: #666; margin-top: 10px; }
        .toc { margin: 30px 0; padding: 20px; background: #f0f7fa; border-radius: 8px; }
        .toc h3 { color: #1a5f7a; }
        .toc ul { list-style: none; padding: 0; }
        .toc li { padding: 5px 0; }
        .toc a { color: #333; text-decoration: none; }
        .toc a:hover { color: #1a5f7a; }
        .footer { text-align: center; margin-top: 50px; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #ddd; }
        @media print { body { background: white; } .report { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="report">
        <div class="title-page">
            <h2>جامعة البترا</h2>
            <h1>التقرير السنوي</h1>
            <h2>2023-2024</h2>
        </div>
        
        <div class="toc">
            <h3>فهرس المحتويات</h3>
            <ul>
'''
        # TOC
        for axis_content in self.content:
            axis = axis_content['data']
            html += f'<li><a href="#axis-{axis.order}"><strong>المحور {axis.order}: {axis.name}</strong></a></li>\n'
            for item_data in axis_content['items']:
                item = item_data['item']
                html += f'<li style="padding-right: 20px;"><a href="#item-{item.code.replace(".", "-")}">{item.code}: {item.name}</a></li>\n'
        
        html += '''
            </ul>
        </div>
'''
        
        # Content
        for axis_content in self.content:
            axis = axis_content['data']
            html += f'''
        <div class="axis" id="axis-{axis.order}">
            <h2 class="axis-title">المحور {axis.order}: {axis.name}</h2>
'''
            for item_data in axis_content['items']:
                item = item_data['item']
                html += f'''
            <div class="item" id="item-{item.code.replace(".", "-")}">
                <h3 class="item-title">{item.code}: {item.name}</h3>
'''
                for comp in item_data['components']:
                    html += self._component_to_html(comp)
                
                html += '            </div>\n'
            
            html += '        </div>\n'
        
        html += f'''
        <div class="footer">
            تم التوليد بواسطة نظام تقرير.ai<br>
            المحاور: {self.stats['axes']} | البنود: {self.stats['items']} | النصوص: {self.stats['texts']} | الجداول: {self.stats['tables']} | الأشكال: {self.stats['figures']}
        </div>
    </div>
</body>
</html>'''
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
    
    def _component_to_html(self, comp) -> str:
        """Convert component to HTML."""
        config = comp.config or {}
        
        if comp.component_type == 'text':
            content = config.get('full_text', '') or config.get('preview', '')
            if content:
                self.stats['texts'] += 1
                return f'<p class="text">{content}</p>\n'
        
        elif comp.component_type == 'table':
            extracted = config.get('extracted_data', {})
            headers = extracted.get('headers', [])
            data_rows = extracted.get('data', [])
            
            if headers and data_rows:
                self.stats['tables'] += 1
                html = '<div class="table-container">\n'
                if comp.title:
                    html += f'<p class="table-title">{comp.title}</p>\n'
                html += '<table><thead><tr>'
                for h in headers:
                    html += f'<th>{h}</th>'
                html += '</tr></thead><tbody>\n'
                
                for row in data_rows[:100]:
                    html += '<tr>'
                    for j, h in enumerate(headers):
                        val = row[j] if isinstance(row, list) and j < len(row) else row.get(h, '') if isinstance(row, dict) else ''
                        html += f'<td>{val}</td>'
                    html += '</tr>\n'
                
                html += '</tbody></table>\n'
                if len(data_rows) > 100:
                    html += f'<p style="text-align:center;font-size:12px;color:#666;">... و {len(data_rows)-100} صف إضافي</p>\n'
                html += '</div>\n'
                return html
        
        elif comp.component_type in ('figure', 'chart'):
            self.stats['figures'] += 1
            title = comp.title or 'شكل'
            
            # Check for static image first
            static_image = config.get('static_image')
            if static_image:
                return f'<div class="figure"><img src="{static_image}" alt="{title}"><p class="figure-title">{title}</p></div>\n'
            
            # Try to generate chart from data
            chart_data = config.get('chart_data', {})
            if chart_data:
                series = chart_data.get('series', [])
                if series and isinstance(series[0], dict):
                    labels = series[0].get('categories', []) or chart_data.get('categories', [])
                    values = series[0].get('values', [])
                    
                    if labels and values:
                        # Generate chart image
                        chart_type = (chart_data.get('type') or 'bar').replace('Chart', '')
                        img_config = {
                            'type': chart_type,
                            'title': title,
                            'data': {
                                'labels': labels,
                                'datasets': [{'label': '', 'values': values}]
                            }
                        }
                        try:
                            img_buffer = generate_chart_image(img_config)
                            if img_buffer:
                                img_name = f"chart_{self.stats['figures']}.png"
                                img_path = self.output_dir / img_name
                                with open(img_path, 'wb') as f:
                                    f.write(img_buffer.read())
                                return f'<div class="figure"><img src="{img_name}" alt="{title}"><p class="figure-title">{title}</p></div>\n'
                        except Exception as e:
                            pass
            
            return f'<div class="figure"><p class="figure-title">[{title}]</p></div>\n'
        
        return ''
    
    def _add_item_from_data(self, item_data):
        """Add item with all its components from collected data."""
        item = item_data['item']
        
        # Item heading
        heading = self.doc.add_heading(f"{item.code}: {item.name}", level=2)
        heading.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        self._set_rtl(heading)
        
        for run in heading.runs:
            self._set_arabic_font(run, 14)
        
        for comp in item_data['components']:
            if comp.component_type == 'text':
                self._add_text_component(comp)
            elif comp.component_type == 'table':
                self._add_table_component(comp)
            elif comp.component_type in ('figure', 'chart'):
                self._add_figure_component(comp)
        
        self.doc.add_paragraph()
    
    def _setup_document(self):
        """Setup document margins and styles."""
        for section in self.doc.sections:
            section.top_margin = Cm(2.5)
            section.bottom_margin = Cm(2.5)
            section.left_margin = Cm(2.5)
            section.right_margin = Cm(2.5)
    
    def _add_title_page(self):
        """Add title page."""
        # University name
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run("جامعة البترا")
        self._set_arabic_font(run, 28)
        run.bold = True
        
        self.doc.add_paragraph()
        self.doc.add_paragraph()
        
        # Report title
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run("التقرير السنوي")
        self._set_arabic_font(run, 36)
        run.bold = True
        run.font.color.rgb = RGBColor(26, 95, 122)
        
        self.doc.add_paragraph()
        
        # Year
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run("2023-2024")
        self._set_arabic_font(run, 32)
        run.bold = True
        
        # Page break
        self.doc.add_page_break()
    
    def _add_toc_placeholder(self):
        """Add table of contents placeholder."""
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run("فهرس المحتويات")
        self._set_arabic_font(run, 18)
        run.bold = True
        
        self.doc.add_paragraph()
        
        # Note about TOC
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run("[يتم تحديث الفهرس تلقائياً في Word: References → Update Table]")
        self._set_arabic_font(run, 11)
        run.italic = True
        
        self.doc.add_page_break()
    
    def _add_axis(self, axis):
        """Add axis heading."""
        # Page break before new axis (except first)
        if self.stats['axes'] > 1:
            self.doc.add_page_break()
        
        # Axis title
        heading = self.doc.add_heading(f"المحور {axis.order}: {axis.name}", level=1)
        heading.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        self._set_rtl(heading)
        
        for run in heading.runs:
            self._set_arabic_font(run, 18)
            run.font.color.rgb = RGBColor(26, 95, 122)
        
        self.doc.add_paragraph()
    
    def _add_item(self, item):
        """Add item with all its components."""
        from apps.templates_app.models import ItemComponent
        
        # Item heading
        heading = self.doc.add_heading(f"{item.code}: {item.name}", level=2)
        heading.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        self._set_rtl(heading)
        
        for run in heading.runs:
            self._set_arabic_font(run, 14)
        
        # Get components ordered
        components = ItemComponent.objects.filter(item=item).order_by('order')
        
        for comp in components:
            if comp.component_type == 'text':
                self._add_text_component(comp)
            elif comp.component_type == 'table':
                self._add_table_component(comp)
            elif comp.component_type in ('figure', 'chart'):
                self._add_figure_component(comp)
        
        self.doc.add_paragraph()
    
    def _add_text_component(self, comp):
        """Add text paragraph."""
        config = comp.config or {}
        content = config.get('full_text', '') or config.get('preview', '')
        
        if not content:
            return
        
        self.stats['texts'] += 1
        
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        self._set_rtl(p)
        
        run = p.add_run(content)
        self._set_arabic_font(run, 12)
    
    def _add_table_component(self, comp):
        """Add table with data."""
        config = comp.config or {}
        extracted = config.get('extracted_data', {})
        
        if not extracted:
            return
        
        headers = extracted.get('headers', [])
        data_rows = extracted.get('data', [])
        
        if not headers or not data_rows:
            return
        
        self.stats['tables'] += 1
        
        # Table title
        if comp.title:
            p = self.doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(comp.title)
            self._set_arabic_font(run, 11)
            run.bold = True
        
        # Create table
        num_rows = min(len(data_rows), 100) + 1  # Limit rows + header
        num_cols = len(headers)
        
        table = self.doc.add_table(rows=num_rows, cols=num_cols)
        table.style = 'Table Grid'
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Headers
        header_row = table.rows[0]
        for j, h in enumerate(headers):
            cell = header_row.cells[j]
            cell.text = str(h)
            for para in cell.paragraphs:
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for run in para.runs:
                    self._set_arabic_font(run, 9)
                    run.bold = True
        
        # Data rows
        for i, row in enumerate(data_rows[:100]):
            if i + 1 >= num_rows:
                break
            table_row = table.rows[i + 1]
            for j, h in enumerate(headers):
                if j >= num_cols:
                    break
                cell = table_row.cells[j]
                val = row[j] if isinstance(row, list) and j < len(row) else row.get(h, '') if isinstance(row, dict) else ''
                cell.text = str(val)[:100]
                for para in cell.paragraphs:
                    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for run in para.runs:
                        self._set_arabic_font(run, 9)
        
        # Note if truncated
        if len(data_rows) > 100:
            p = self.doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(f"... و {len(data_rows) - 100} صف إضافي")
            self._set_arabic_font(run, 9)
            run.italic = True
        
        self.doc.add_paragraph()
    
    def _add_figure_component(self, comp):
        """Add figure/chart."""
        config = comp.config or {}
        
        self.stats['figures'] += 1
        
        # Check for static image first
        static_image = config.get('static_image')
        if static_image:
            img_path = self.output_dir / static_image
            if img_path.exists():
                self.doc.add_picture(str(img_path), width=Inches(5))
                self.doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
                
                if comp.title:
                    p = self.doc.add_paragraph()
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    run = p.add_run(comp.title)
                    self._set_arabic_font(run, 10)
                    run.italic = True
                
                self.doc.add_paragraph()
                return
        
        chart_data = config.get('chart_data', {})
        
        if not chart_data:
            return
        
        # Try to generate chart image
        try:
            series = chart_data.get('series', [])
            
            # Labels might be inside series[0] OR at top level
            if series and isinstance(series[0], dict):
                labels = series[0].get('categories', []) or chart_data.get('categories', []) or chart_data.get('labels', [])
                values = series[0].get('values', series[0].get('data', []))
            elif series:
                labels = chart_data.get('categories', []) or chart_data.get('labels', [])
                values = series
            else:
                labels = chart_data.get('categories', []) or chart_data.get('labels', [])
                values = []
            
            if labels and values:
                chart_type = (chart_data.get('type') or 'bar').replace('Chart', '')
                img_config = {
                    'type': chart_type,
                    'title': comp.title or '',
                    'data': {
                        'labels': labels,
                        'datasets': [{'label': '', 'values': values}]
                    }
                }
                
                img_buffer = generate_chart_image(img_config)
                
                if img_buffer:
                    # Save temp image
                    img_path = self.output_dir / f"temp_chart_{self.stats['figures']}.png"
                    with open(img_path, 'wb') as f:
                        f.write(img_buffer.read())
                    
                    # Add to document
                    self.doc.add_picture(str(img_path), width=Inches(5))
                    self.doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
                    
                    # Clean up
                    os.remove(img_path)
        except Exception as e:
            print(f"Warning: Could not generate chart: {e}")
        
        # Figure caption
        if comp.title:
            p = self.doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(comp.title)
            self._set_arabic_font(run, 10)
            run.italic = True
        
        self.doc.add_paragraph()
    
    def _set_rtl(self, paragraph):
        """Set paragraph to RTL."""
        pPr = paragraph._p.get_or_add_pPr()
        bidi = pPr.makeelement(qn('w:bidi'), {})
        pPr.append(bidi)
    
    def _set_arabic_font(self, run, size=12):
        """Set Arabic font."""
        if not run:
            return
        run.font.name = 'Arial'
        run.font.size = Pt(size)
        run._element.rPr.rFonts.set(qn('w:cs'), 'Arial')
    
    def get_stats(self) -> dict:
        """Get generation statistics."""
        return self.stats.copy()
