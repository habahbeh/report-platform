#!/usr/bin/env python3
"""
Complete all missing elements:
1. Extract remaining tables from Word
2. Generate missing charts from data
3. Regenerate all reports
"""

import json
import os
import sys
import re
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

from docx import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

REPORT_PATH = Path(__file__).parent.parent / "habahbeh/التقرير السنوي لجامعة البترا 2023-2024 حتى تاريخ 29.09.2025.docx"
DATA_DIR = Path(__file__).parent.parent / 'data'


def iter_blocks(doc):
    for child in doc.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield ('p', Paragraph(child, doc))
        elif isinstance(child, CT_Tbl):
            yield ('t', Table(child, doc))


def extract_table(table):
    """Extract table data."""
    rows = []
    headers = []
    for i, row in enumerate(table.rows):
        cells = [c.text.strip() for c in row.cells]
        if i == 0:
            headers = cells
        else:
            if headers:
                rows.append({headers[j] if j < len(headers) else f'c{j}': v for j, v in enumerate(cells)})
    return {'headers': headers, 'rows': rows, 'count': len(rows)}


def find_table_id(text):
    """Find table ID in text."""
    m = re.search(r'جدول\s*\(?\s*(\d+)\s*[-–]\s*(\d+)', text)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    return None


def find_item(text):
    """Find item code."""
    t = text.translate(str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789'))
    m = re.match(r'^(\d+)\.(\d+)\s*[:\.]', t.strip())
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    return None


def create_chart(data, title, output_path, chart_type='bar'):
    """Create chart from data."""
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        
        if isinstance(data, dict):
            labels = list(data.keys())[:15]
            values = [float(v) if isinstance(v, (int, float)) else 0 for v in list(data.values())[:15]]
        elif isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], dict):
                # Get first numeric column
                keys = list(data[0].keys())
                label_key = keys[0]
                value_key = None
                for k in keys[1:]:
                    try:
                        float(str(data[0][k]).replace(',', '').replace('%', ''))
                        value_key = k
                        break
                    except:
                        pass
                if value_key:
                    labels = [str(r.get(label_key, ''))[:20] for r in data[:15]]
                    values = []
                    for r in data[:15]:
                        try:
                            v = str(r.get(value_key, '0')).replace(',', '').replace('%', '')
                            values.append(float(v))
                        except:
                            values.append(0)
                else:
                    return False
            else:
                labels = [str(i) for i in range(len(data[:15]))]
                values = [float(v) if isinstance(v, (int, float)) else 0 for v in data[:15]]
        else:
            return False
        
        if not values or all(v == 0 for v in values):
            return False
        
        if chart_type == 'pie' and len(labels) <= 8:
            ax.pie(values, labels=labels, autopct='%1.1f%%', startangle=90)
        else:
            bars = ax.bar(range(len(labels)), values, color='#1a5f7a')
            ax.set_xticks(range(len(labels)))
            ax.set_xticklabels(labels, rotation=45, ha='right', fontsize=8)
            for bar, v in zip(bars, values):
                ax.text(bar.get_x() + bar.get_width()/2, bar.get_height(), 
                       f'{int(v)}', ha='center', va='bottom', fontsize=7)
        
        ax.set_title(title[:60], fontsize=11)
        plt.tight_layout()
        plt.savefig(output_path, dpi=120, bbox_inches='tight')
        plt.close()
        return True
    except Exception as e:
        print(f"      ❌ Chart error: {e}")
        return False


def main():
    print("=" * 70)
    print("إكمال جميع العناصر الناقصة")
    print("=" * 70)
    print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
    
    # Load existing structure
    structure_file = DATA_DIR / 'precise_structure.json'
    with open(structure_file, encoding='utf-8') as f:
        structure = json.load(f)
    
    items_data = structure.get('items', {})
    
    # Step 1: Extract ALL tables with better matching
    print("\n📋 Step 1: استخراج جميع الجداول...")
    
    doc = Document(str(REPORT_PATH))
    
    current_item = None
    pending_table_id = None
    all_tables = {}
    
    for btype, block in iter_blocks(doc):
        if btype == 'p':
            text = block.text.strip()
            if not text:
                continue
            
            item = find_item(text)
            if item:
                current_item = item
            
            tid = find_table_id(text)
            if tid:
                pending_table_id = (tid, text[:150])
        
        elif btype == 't' and len(block.rows) >= 2:
            data = extract_table(block)
            
            if current_item:
                code_safe = current_item.replace('.', '_')
                item_dir = DATA_DIR / f'item_{code_safe}'
                item_dir.mkdir(exist_ok=True)
                
                # Save table
                if current_item not in all_tables:
                    all_tables[current_item] = []
                
                table_info = {
                    'id': pending_table_id[0] if pending_table_id else f'auto_{len(all_tables[current_item])}',
                    'title': pending_table_id[1] if pending_table_id else 'جدول',
                    'headers': data['headers'],
                    'rows': data['rows'][:200],
                    'count': data['count']
                }
                all_tables[current_item].append(table_info)
            
            pending_table_id = None
    
    # Save all tables
    for item_code, tables in all_tables.items():
        code_safe = item_code.replace('.', '_')
        item_dir = DATA_DIR / f'item_{code_safe}'
        item_dir.mkdir(exist_ok=True)
        
        tables_file = item_dir / 'tables.json'
        with open(tables_file, 'w', encoding='utf-8') as f:
            json.dump(tables, f, ensure_ascii=False, indent=2)
        
        total_rows = sum(t['count'] for t in tables)
        print(f"  ✅ {item_code}: {len(tables)} جداول، {total_rows} صف")
    
    # Step 2: Generate charts from table data
    print("\n📊 Step 2: توليد الرسوم البيانية...")
    
    charts_generated = 0
    
    for item_code, item_info in items_data.items():
        figures = item_info.get('figures', [])
        if not figures:
            continue
        
        code_safe = item_code.replace('.', '_')
        item_dir = DATA_DIR / f'item_{code_safe}'
        charts_dir = item_dir / 'charts'
        charts_dir.mkdir(parents=True, exist_ok=True)
        
        # Load tables
        tables_file = item_dir / 'tables.json'
        tables = []
        if tables_file.exists():
            with open(tables_file) as f:
                tables = json.load(f)
        
        table_data = item_info.get('table_data', [])
        
        for i, fig in enumerate(figures):
            fig_id = fig.get('id', f'{i+1}')
            fig_title = fig.get('title', f'شكل {fig_id}')[:80]
            
            chart_path = charts_dir / f'chart_{fig_id.replace("-", "_")}.png'
            
            if chart_path.exists():
                continue
            
            # Try to find matching data
            data_source = None
            
            # Check tables
            for t in tables + table_data:
                rows = t.get('rows', t.get('data', []))
                if rows and len(rows) >= 2:
                    data_source = rows
                    break
            
            if data_source:
                if create_chart(data_source, fig_title, chart_path):
                    charts_generated += 1
                    print(f"  ✅ {item_code} شكل {fig_id}")
    
    print(f"\n  Generated {charts_generated} new charts")
    
    # Step 3: Regenerate all HTML reports
    print("\n📄 Step 3: إعادة توليد التقارير...")
    
    import django
    django.setup()
    from apps.templates_app.models import Item
    
    for item_code in sorted(items_data.keys(), key=lambda x: (int(x.split('.')[0]), int(x.split('.')[1]))):
        item_info = items_data[item_code]
        code_safe = item_code.replace('.', '_')
        item_dir = DATA_DIR / f'item_{code_safe}'
        item_dir.mkdir(exist_ok=True)
        
        # Get item name
        item = Item.objects.filter(code=item_code, axis_id__lte=6).first()
        item_name = item.name if item else item_info.get('title', item_code)
        
        # Load tables
        tables = []
        tables_file = item_dir / 'tables.json'
        if tables_file.exists():
            with open(tables_file) as f:
                tables = json.load(f)
        
        # Find charts
        charts = []
        charts_dir = item_dir / 'charts'
        if charts_dir.exists():
            charts = sorted(charts_dir.glob('*.png'))
        
        # Also check item dir for old charts
        for c in item_dir.glob('*.png'):
            if c not in charts:
                charts.append(c)
        
        # Generate HTML
        paragraphs = item_info.get('paragraphs', [])
        figures = item_info.get('figures', [])
        
        html = generate_html(item_code, item_name, paragraphs, tables, charts, figures)
        
        html_file = item_dir / f'item_{code_safe}.html'
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        # Status
        req_tables = len(item_info.get('tables', []))
        req_figures = len(figures)
        has_tables = len(tables)
        has_charts = len(charts)
        
        if req_tables <= has_tables and req_figures <= has_charts:
            status = "✅"
        elif has_tables > 0 or has_charts > 0:
            status = "🟡"
        else:
            status = "⚪"
        
        print(f"  {status} {item_code}: {has_tables}ج/{req_tables} + {has_charts}ش/{req_figures}")
    
    print("\n" + "=" * 70)
    print(f"Completed: {datetime.now().strftime('%H:%M:%S')}")


def generate_html(item_code, item_name, paragraphs, tables, charts, figures):
    """Generate complete HTML."""
    html = f'''<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>{item_code}: {item_name}</title>
    <style>
        * {{ box-sizing: border-box; }}
        body {{ font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; 
               padding: 40px; max-width: 1100px; margin: 0 auto; line-height: 1.8; 
               background: #f5f5f5; color: #333; }}
        article {{ background: white; padding: 40px; border-radius: 12px; 
                  box-shadow: 0 2px 15px rgba(0,0,0,0.1); }}
        h1 {{ color: #1a5f7a; border-bottom: 3px solid #1a5f7a; padding-bottom: 15px; }}
        .paragraph {{ margin: 15px 0; text-align: justify; }}
        .chart-section {{ text-align: center; margin: 30px 0; padding: 20px;
                         background: #f8f9fa; border-radius: 8px; }}
        .chart-section img {{ max-width: 100%; border-radius: 8px; }}
        .chart-title {{ font-weight: bold; color: #1a5f7a; margin-top: 10px; }}
        .table-section {{ margin: 30px 0; }}
        .table-header {{ background: #1a5f7a; color: white; padding: 12px; 
                        border-radius: 8px 8px 0 0; font-weight: bold; }}
        .table-stats {{ background: #e8f4f8; padding: 8px; font-size: 0.9em; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: center; }}
        th {{ background: #2980b9; color: white; }}
        tr:nth-child(even) {{ background: #f9f9f9; }}
        .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;
                  color: #888; font-size: 11px; text-align: center; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px;
                 font-size: 11px; margin: 2px; }}
        .badge-success {{ background: #d4edda; color: #155724; }}
        .badge-warning {{ background: #fff3cd; color: #856404; }}
    </style>
</head>
<body>
    <article>
        <h1>{item_code}: {item_name}</h1>
        <div style="margin-bottom:20px;">
            <span class="badge badge-success">📝 {len(paragraphs)} فقرة</span>
            <span class="badge badge-success">📋 {len(tables)} جدول</span>
            <span class="badge {'badge-success' if len(charts) >= len(figures) else 'badge-warning'}">📊 {len(charts)}/{len(figures)} شكل</span>
        </div>
'''
    
    # Paragraphs
    for p in paragraphs:
        html += f'        <div class="paragraph">{p}</div>\n'
    
    # Charts
    if charts:
        html += '\n        <!-- الأشكال -->\n'
        for chart in charts:
            rel_path = f"charts/{chart.name}" if 'charts' in str(chart) else chart.name
            html += f'''
        <div class="chart-section">
            <img src="{rel_path}" alt="رسم بياني">
        </div>
'''
    
    # Tables
    if tables:
        html += '\n        <!-- الجداول -->\n'
        for t in tables:
            title = t.get('title', 'جدول')[:100]
            headers = t.get('headers', [])
            rows = t.get('rows', [])[:100]
            count = t.get('count', len(rows))
            
            html += f'''
        <div class="table-section">
            <div class="table-header">{title}</div>
            <div class="table-stats">📊 {count} صف من البيانات</div>
            <table>
                <thead><tr>
'''
            for h in headers:
                html += f'                    <th>{h}</th>\n'
            html += '                </tr></thead>\n                <tbody>\n'
            
            for row in rows:
                html += '                    <tr>\n'
                for h in headers:
                    v = row.get(h, '') if isinstance(row, dict) else ''
                    html += f'                        <td>{str(v)[:80]}</td>\n'
                html += '                    </tr>\n'
            
            if count > 100:
                html += f'                    <tr><td colspan="{len(headers)}" style="font-style:italic">... و {count-100} صف إضافي</td></tr>\n'
            
            html += '                </tbody>\n            </table>\n        </div>\n'
    
    html += f'''
        <div class="footer">
            تم التوليد بواسطة نظام تقرير.ai — {datetime.now().strftime('%Y-%m-%d %H:%M')}
        </div>
    </article>
</body>
</html>'''
    
    return html


if __name__ == '__main__':
    main()
