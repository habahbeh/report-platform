#!/usr/bin/env python3
"""
Extract ALL data from the original Word report:
- Table data (rows, columns, values)
- Chart data (from embedded charts)
- Save to database
"""

import os
import sys
import re
import json
import django
from zipfile import ZipFile
from xml.etree import ElementTree as ET

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from docx import Document
from docx.document import Document as DocumentType
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

from apps.templates_app.models import Template, Item, ItemComponent

REPORT_PATH = "/Users/mohammadhabahbeh/Desktop/report yearly/2023-2024/التقرير السنوي لجامعة البترا 2023-2024 حتى تاريخ 29.09.2025.docx"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'extracted')


def iter_block_items(parent):
    """Iterate through paragraphs and tables in document order."""
    parent_elm = parent.element.body if isinstance(parent, DocumentType) else parent._element
    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield ('paragraph', Paragraph(child, parent))
        elif isinstance(child, CT_Tbl):
            yield ('table', Table(child, parent))


def extract_table_data(table):
    """Extract all data from a table."""
    data = {
        'rows': len(table.rows),
        'cols': len(table.columns),
        'headers': [],
        'data': []
    }
    
    for i, row in enumerate(table.rows):
        row_data = []
        for cell in row.cells:
            row_data.append(cell.text.strip())
        
        if i == 0:
            data['headers'] = row_data
        else:
            data['data'].append(row_data)
    
    return data


def find_table_title(paragraphs_before):
    """Find table title from preceding paragraphs."""
    for para in reversed(paragraphs_before[-5:]):
        text = para.strip()
        match = re.match(r'^جدول\s*\((\d+-\d+)\)\s*[:\s]*(.+)?', text)
        if match:
            return {
                'code': match.group(1),
                'title': text
            }
    return None


def extract_chart_data_from_docx(docx_path):
    """Extract data from embedded charts in the docx file."""
    charts = []
    
    with ZipFile(docx_path, 'r') as zf:
        # Find all chart XML files
        chart_files = [f for f in zf.namelist() if 'chart' in f and f.endswith('.xml')]
        
        for chart_file in chart_files:
            try:
                chart_xml = zf.read(chart_file)
                root = ET.fromstring(chart_xml)
                
                # Namespace for chart XML
                ns = {
                    'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart',
                    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
                }
                
                chart_data = {
                    'file': chart_file,
                    'type': None,
                    'title': None,
                    'series': []
                }
                
                # Get chart title
                title_elem = root.find('.//c:title//a:t', ns)
                if title_elem is not None:
                    chart_data['title'] = title_elem.text
                
                # Detect chart type
                for chart_type in ['barChart', 'pieChart', 'lineChart', 'areaChart', 'doughnutChart']:
                    if root.find(f'.//c:{chart_type}', ns) is not None:
                        chart_data['type'] = chart_type
                        break
                
                # Extract series data
                for ser in root.findall('.//c:ser', ns):
                    series = {
                        'name': None,
                        'categories': [],
                        'values': []
                    }
                    
                    # Series name
                    name_elem = ser.find('.//c:tx//c:v', ns)
                    if name_elem is not None:
                        series['name'] = name_elem.text
                    
                    # Categories (X-axis labels)
                    for cat in ser.findall('.//c:cat//c:v', ns):
                        series['categories'].append(cat.text)
                    
                    # Values (Y-axis data)
                    for val in ser.findall('.//c:val//c:v', ns):
                        try:
                            series['values'].append(float(val.text))
                        except:
                            series['values'].append(val.text)
                    
                    if series['values']:
                        chart_data['series'].append(series)
                
                if chart_data['series']:
                    charts.append(chart_data)
                    
            except Exception as e:
                print(f"   ⚠ Error parsing {chart_file}: {e}")
    
    return charts


def extract_all_tables_with_context(doc):
    """Extract all tables with their context (title, item code)."""
    tables_data = []
    current_item = None
    recent_paragraphs = []
    table_index = 0
    
    for block_type, block in iter_block_items(doc):
        if block_type == 'paragraph':
            text = block.text.strip()
            if not text:
                continue
            
            # Check for item header
            match = re.match(r'^(\d+\.\d+)\s*[:\s]', text)
            if match:
                current_item = match.group(1)
                recent_paragraphs = []
            else:
                recent_paragraphs.append(text)
        
        elif block_type == 'table':
            table_index += 1
            table_info = find_table_title(recent_paragraphs)
            table_data = extract_table_data(block)
            
            tables_data.append({
                'index': table_index,
                'item_code': current_item,
                'table_code': table_info['code'] if table_info else None,
                'title': table_info['title'] if table_info else f"جدول {table_index}",
                'rows': table_data['rows'],
                'cols': table_data['cols'],
                'headers': table_data['headers'],
                'data': table_data['data']
            })
    
    return tables_data


def save_to_db(tables_data, charts_data, template):
    """Save extracted data to ItemComponent config."""
    
    stats = {'tables_linked': 0, 'charts_linked': 0}
    
    # Create a mapping of table codes to data
    table_map = {}
    for table in tables_data:
        if table['table_code']:
            table_map[table['table_code']] = table
    
    # Update ItemComponents with table data
    for item in Item.objects.filter(axis__template=template):
        for comp in item.components.filter(component_type='table'):
            # Try to find matching table data
            config = comp.config or {}
            table_code = config.get('table_code')
            
            if table_code and table_code in table_map:
                table = table_map[table_code]
                config['extracted_data'] = {
                    'headers': table['headers'],
                    'data': table['data'][:50],  # Limit to 50 rows
                    'total_rows': len(table['data']),
                }
                comp.config = config
                comp.save()
                stats['tables_linked'] += 1
    
    return stats


def main():
    print("=" * 70)
    print("📊 استخراج جميع البيانات من التقرير الأصلي")
    print("=" * 70)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Load document
    print("\n📄 تحميل الملف...")
    doc = Document(REPORT_PATH)
    
    # Extract tables
    print("\n📊 استخراج الجداول...")
    tables_data = extract_all_tables_with_context(doc)
    print(f"   ✓ تم استخراج {len(tables_data)} جدول")
    
    # Show sample
    print("\n   عينة من الجداول:")
    for table in tables_data[:5]:
        code = table['table_code'] or '?'
        rows = len(table['data'])
        print(f"   - جدول ({code}): {rows} صف | البند {table['item_code']}")
    
    # Save tables to JSON
    tables_file = os.path.join(OUTPUT_DIR, 'all_tables.json')
    with open(tables_file, 'w', encoding='utf-8') as f:
        json.dump(tables_data, f, ensure_ascii=False, indent=2)
    print(f"\n   💾 حُفظ في: {tables_file}")
    
    # Extract charts
    print("\n📈 استخراج الرسوم البيانية...")
    charts_data = extract_chart_data_from_docx(REPORT_PATH)
    print(f"   ✓ تم استخراج {len(charts_data)} رسم بياني")
    
    # Show sample
    print("\n   عينة من الرسوم:")
    for chart in charts_data[:5]:
        chart_type = chart['type'] or 'unknown'
        series_count = len(chart['series'])
        title = chart['title'] or 'بدون عنوان'
        print(f"   - {chart_type}: {title[:40]} ({series_count} series)")
    
    # Save charts to JSON
    charts_file = os.path.join(OUTPUT_DIR, 'all_charts.json')
    with open(charts_file, 'w', encoding='utf-8') as f:
        json.dump(charts_data, f, ensure_ascii=False, indent=2)
    print(f"\n   💾 حُفظ في: {charts_file}")
    
    # Save to database
    print("\n💾 حفظ في قاعدة البيانات...")
    template = Template.objects.get(id=1)
    stats = save_to_db(tables_data, charts_data, template)
    print(f"   ✓ تم ربط {stats['tables_linked']} جدول")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 ملخص الاستخراج:")
    print("=" * 70)
    print(f"   📊 الجداول: {len(tables_data)}")
    print(f"   📈 الرسوم: {len(charts_data)}")
    print(f"   💾 مرتبط بالـ DB: {stats['tables_linked']}")
    print("\n   الملفات:")
    print(f"   - {tables_file}")
    print(f"   - {charts_file}")


if __name__ == '__main__':
    main()
