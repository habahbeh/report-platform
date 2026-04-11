#!/usr/bin/env python3
"""
Final regeneration with all data: texts + tables + charts.
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from apps.templates_app.models import Item
from apps.reports.models import ItemStructure

DATA_DIR = Path(__file__).parent.parent / 'data'
STRUCTURES_FILE = DATA_DIR / 'all_structures.json'


def load_structures():
    with open(STRUCTURES_FILE, encoding='utf-8') as f:
        return json.load(f)


def generate_complete_html(item_code, item_name, structure, tables, charts):
    """Generate complete HTML with texts, tables, and charts."""
    
    texts = structure.get('texts', [])
    
    html = f'''<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>{item_code}: {item_name}</title>
    <style>
        * {{ box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl; padding: 40px; max-width: 1100px;
            margin: 0 auto; line-height: 1.8; color: #333;
            background: #fafafa;
        }}
        article {{ background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #1a5f7a; border-bottom: 3px solid #1a5f7a; padding-bottom: 15px; margin-bottom: 30px; }}
        .paragraph {{ margin: 15px 0; text-align: justify; line-height: 2; }}
        .chart-container {{ text-align: center; margin: 30px 0; }}
        .chart-container img {{ max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .chart-title {{ font-style: italic; color: #666; margin-top: 10px; }}
        .table-section {{ margin: 30px 0; }}
        .table-title {{ font-weight: bold; text-align: center; margin-bottom: 15px; color: #1a5f7a; font-size: 1.1em; }}
        .table-stats {{ background: #e8f4f8; padding: 10px 15px; border-radius: 5px; margin-bottom: 10px; text-align: center; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: center; }}
        th {{ background: #1a5f7a; color: white; font-weight: bold; }}
        tr:nth-child(even) {{ background: #f9f9f9; }}
        tr:hover {{ background: #f0f7fa; }}
        .footer {{ margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 11px; text-align: center; }}
        .status {{ display: inline-block; padding: 3px 10px; border-radius: 15px; font-size: 11px; }}
        .status-complete {{ background: #d4edda; color: #155724; }}
        .status-partial {{ background: #fff3cd; color: #856404; }}
    </style>
</head>
<body>
    <article>
        <h1>{item_code}: {item_name}</h1>
'''
    
    # Add texts
    for text in texts:
        if text.strip():
            html += f'        <div class="paragraph">{text}</div>\n'
    
    # Add charts
    if charts:
        html += '\n        <!-- الرسوم البيانية -->\n'
        for chart_path in charts:
            chart_name = chart_path.name
            html += f'''
        <div class="chart-container">
            <img src="charts/{chart_name}" alt="رسم بياني">
        </div>
'''
    
    # Add tables
    if tables:
        html += '\n        <!-- الجداول -->\n'
        for table in tables:
            title = table.get('title', 'جدول')
            headers = table.get('headers', [])
            data = table.get('data', [])
            
            html += f'''
        <div class="table-section">
            <p class="table-title">{title}</p>
            <div class="table-stats">📊 {len(data)} صف من البيانات الحقيقية</div>
            <table>
                <thead><tr>
'''
            for h in headers:
                html += f'                    <th>{h}</th>\n'
            
            html += '                </tr></thead>\n                <tbody>\n'
            
            for row in data[:100]:
                html += '                    <tr>\n'
                for h in headers:
                    val = row.get(h, '') if isinstance(row, dict) else ''
                    val_str = str(val)[:80] if val else ''
                    html += f'                        <td>{val_str}</td>\n'
                html += '                    </tr>\n'
            
            if len(data) > 100:
                html += f'                    <tr><td colspan="{len(headers)}" style="font-style:italic;">... و {len(data) - 100} صف إضافي</td></tr>\n'
            
            html += '                </tbody>\n            </table>\n        </div>\n'
    
    # Determine status
    has_tables = len(tables) > 0
    has_charts = len(charts) > 0
    status_class = "status-complete" if (has_tables or len(structure.get('tables', [])) == 0) else "status-partial"
    status_text = "✅ مكتمل" if status_class == "status-complete" else "🟡 جزئي"
    
    html += f'''
        <div class="footer">
            <span class="status {status_class}">{status_text}</span><br>
            تم التوليد بواسطة نظام تقرير.ai — {datetime.now().strftime('%Y-%m-%d %H:%M')}
        </div>
    </article>
</body>
</html>'''
    
    return html


def main():
    print("=" * 60)
    print("التوليد النهائي الشامل")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
    
    structures = load_structures()
    
    stats = {'complete': 0, 'partial': 0, 'total_rows': 0, 'total_charts': 0}
    
    for item_code, structure in structures.items():
        code_safe = item_code.replace('.', '_')
        item_dir = DATA_DIR / f'item_{code_safe}'
        item_dir.mkdir(exist_ok=True)
        
        # Get item name
        item = Item.objects.filter(code=item_code, axis_id__lte=6).first()
        item_name = item.name if item else structure.get('title', '')
        
        # Load tables
        tables = []
        tables_file = item_dir / 'tables.json'
        if tables_file.exists():
            with open(tables_file, encoding='utf-8') as f:
                tables = json.load(f)
        
        # Find charts
        charts = []
        charts_dir = item_dir / 'charts'
        if charts_dir.exists():
            charts = list(charts_dir.glob('*.png'))
        
        # Also check root of item_dir for old charts
        for old_chart in item_dir.glob('*.png'):
            if old_chart not in charts:
                charts.append(old_chart)
        
        # Generate HTML
        html = generate_complete_html(item_code, item_name, structure, tables, charts)
        
        # Save
        html_file = item_dir / f'item_{code_safe}.html'
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        # Stats
        total_rows = sum(len(t.get('data', [])) for t in tables)
        stats['total_rows'] += total_rows
        stats['total_charts'] += len(charts)
        
        required_tables = len(structure.get('tables', []))
        has_enough = len(tables) >= required_tables or required_tables == 0
        
        if has_enough:
            stats['complete'] += 1
            status = "✅"
        else:
            stats['partial'] += 1
            status = "🟡"
        
        print(f"{status} {item_code}: {len(tables)} جداول, {total_rows} صف, {len(charts)} رسم")
    
    print("\n" + "=" * 60)
    print("النتيجة النهائية:")
    print(f"  ✅ مكتمل: {stats['complete']}")
    print(f"  🟡 جزئي: {stats['partial']}")
    print(f"  📊 إجمالي الصفوف: {stats['total_rows']}")
    print(f"  📈 إجمالي الرسوم: {stats['total_charts']}")
    print(f"\nCompleted: {datetime.now().strftime('%H:%M:%S')}")


if __name__ == '__main__':
    main()
