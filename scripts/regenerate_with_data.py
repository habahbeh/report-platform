#!/usr/bin/env python3
"""
Regenerate reports with extracted table data.
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Setup Django
PROJECT_ROOT = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(PROJECT_ROOT))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from apps.templates_app.models import Item
from apps.reports.models import ItemStructure, Project

DATA_DIR = Path(__file__).parent.parent / 'data'


def load_item_tables(item_code):
    """Load extracted tables for an item."""
    code_safe = item_code.replace('.', '_')
    tables_file = DATA_DIR / f'item_{code_safe}' / 'tables.json'
    
    if tables_file.exists():
        with open(tables_file, encoding='utf-8') as f:
            return json.load(f)
    return []


def generate_html_report(item_code, item_name, components, tables):
    """Generate HTML report with real data."""
    
    html = f'''<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>{item_code}: {item_name}</title>
    <style>
        * {{ box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl; padding: 40px; max-width: 1000px;
            margin: 0 auto; line-height: 1.8; color: #333;
        }}
        h1 {{ color: #1a5f7a; border-bottom: 3px solid #1a5f7a; padding-bottom: 10px; }}
        h2 {{ color: #2980b9; margin-top: 30px; }}
        .paragraph {{ margin: 20px 0; text-align: justify; }}
        .table-container {{ margin: 30px 0; overflow-x: auto; }}
        .table-title {{ font-weight: bold; text-align: center; margin-bottom: 10px; color: #1a5f7a; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: center; }}
        th {{ background: #1a5f7a; color: white; }}
        tr:nth-child(even) {{ background: #f9f9f9; }}
        .stats {{ background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        .footer {{ margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; 
                   color: #666; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <article>
        <h1>{item_code}: {item_name}</h1>
'''
    
    # Add paragraphs
    table_idx = 0
    for comp in components:
        if comp.get('type') == 'paragraph':
            content = comp.get('content', '')
            if content:
                html += f'        <div class="paragraph">{content}</div>\n'
        
        elif comp.get('type') == 'table':
            # Use real table data if available
            if table_idx < len(tables):
                table = tables[table_idx]
                html += generate_table_html(table)
                table_idx += 1
            else:
                title = comp.get('title', 'جدول')
                html += f'        <div class="table-container"><p class="table-title">[{title}]</p></div>\n'
    
    # Add remaining tables
    while table_idx < len(tables):
        html += generate_table_html(tables[table_idx])
        table_idx += 1
    
    html += '''
        <div class="footer">
            تم التوليد بواسطة نظام تقرير.ai — بيانات حقيقية من التقرير الأصلي
        </div>
    </article>
</body>
</html>'''
    
    return html


def generate_table_html(table):
    """Generate HTML for a single table."""
    title = table.get('title', 'جدول')
    headers = table.get('headers', [])
    data = table.get('data', [])
    
    html = f'''
        <div class="table-container">
            <p class="table-title">{title}</p>
            <div class="stats">📊 {len(data)} صف من البيانات</div>
            <table>
                <thead><tr>
'''
    
    for h in headers:
        html += f'                    <th>{h}</th>\n'
    
    html += '                </tr></thead>\n                <tbody>\n'
    
    # Limit to 100 rows
    for row in data[:100]:
        html += '                    <tr>\n'
        if isinstance(row, dict):
            for h in headers:
                val = row.get(h, '')
                html += f'                        <td>{val[:100] if isinstance(val, str) else val}</td>\n'
        html += '                    </tr>\n'
    
    if len(data) > 100:
        html += f'                    <tr><td colspan="{len(headers)}">... و {len(data) - 100} صف إضافي</td></tr>\n'
    
    html += '                </tbody>\n            </table>\n        </div>\n'
    
    return html


def main():
    print("=" * 60)
    print("إعادة توليد التقارير مع البيانات الحقيقية")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
    print()
    
    # Items with extracted tables
    items_with_tables = []
    for item_dir in DATA_DIR.glob('item_*'):
        tables_file = item_dir / 'tables.json'
        if tables_file.exists():
            code = item_dir.name.replace('item_', '').replace('_', '.')
            items_with_tables.append(code)
    
    print(f"Found {len(items_with_tables)} items with table data")
    print()
    
    regenerated = 0
    
    for item_code in sorted(items_with_tables):
        # Load tables
        tables = load_item_tables(item_code)
        if not tables:
            continue
        
        # Get item from DB
        item = Item.objects.filter(code=item_code, axis_id__lte=6).first()
        if not item:
            continue
        
        # Get structure
        structure = ItemStructure.objects.filter(item=item).first()
        components = structure.components if structure else []
        
        # Generate HTML
        html = generate_html_report(item_code, item.name, components, tables)
        
        # Save
        code_safe = item_code.replace('.', '_')
        output_dir = DATA_DIR / f'item_{code_safe}'
        html_file = output_dir / f'item_{code_safe}.html'
        
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        total_rows = sum(t.get('rows', len(t.get('data', []))) for t in tables)
        print(f"✅ {item_code}: {len(tables)} جداول، {total_rows} صف")
        regenerated += 1
    
    print()
    print(f"Regenerated: {regenerated} items")
    print(f"Completed: {datetime.now().strftime('%H:%M:%S')}")


if __name__ == '__main__':
    main()
