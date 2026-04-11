#!/usr/bin/env python3
"""
Generate chart images from extracted table data.
"""

import json
import os
import sys
from pathlib import Path

# Add backend path
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import rcParams
import numpy as np

# Arabic font support
rcParams['font.family'] = 'Arial'
plt.rcParams['axes.unicode_minus'] = False

DATA_DIR = Path(__file__).parent.parent / 'data'


def create_bar_chart(data, title, output_path, xlabel='', ylabel=''):
    """Create a bar chart."""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    labels = list(data.keys())
    values = list(data.values())
    
    bars = ax.bar(range(len(labels)), values, color='#1a5f7a')
    
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha='right', fontsize=9)
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    
    # Add value labels
    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                str(int(val)), ha='center', va='bottom', fontsize=8)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    return True


def create_pie_chart(data, title, output_path):
    """Create a pie chart."""
    fig, ax = plt.subplots(figsize=(8, 8))
    
    labels = list(data.keys())
    values = list(data.values())
    
    colors = plt.cm.Set3(np.linspace(0, 1, len(labels)))
    
    ax.pie(values, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
    ax.set_title(title, fontsize=14, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    return True


def create_line_chart(years, values, title, output_path):
    """Create a line chart."""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    ax.plot(years, values, marker='o', linewidth=2, markersize=8, color='#1a5f7a')
    ax.fill_between(years, values, alpha=0.3, color='#1a5f7a')
    
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel('السنة')
    ax.set_ylabel('العدد')
    ax.grid(True, alpha=0.3)
    
    # Add value labels
    for x, y in zip(years, values):
        ax.annotate(str(int(y)), (x, y), textcoords="offset points", 
                   xytext=(0, 10), ha='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    return True


def generate_charts_for_item(item_code, tables):
    """Generate charts based on table data."""
    code_safe = item_code.replace('.', '_')
    output_dir = DATA_DIR / f'item_{code_safe}'
    charts_dir = output_dir / 'charts'
    charts_dir.mkdir(exist_ok=True)
    
    charts_generated = 0
    
    for i, table in enumerate(tables):
        headers = table.get('headers', [])
        data = table.get('data', [])
        title = table.get('title', f'شكل {i+1}')[:50]
        
        if not data:
            continue
        
        # Try to create meaningful charts based on data
        
        # If has numeric columns, try bar chart
        if len(headers) >= 2 and len(data) >= 2:
            # Find label and value columns
            label_col = None
            value_col = None
            
            for h in headers:
                h_lower = h.lower() if h else ''
                if any(k in h_lower for k in ['اسم', 'كلية', 'برنامج', 'الرقم', 'البند']):
                    label_col = h
                elif any(k in h_lower for k in ['عدد', 'نسبة', 'قيمة', 'مجموع']):
                    value_col = h
            
            if not label_col:
                label_col = headers[0]
            if not value_col:
                # Find first numeric-looking column
                for h in headers[1:]:
                    sample = data[0].get(h, '')
                    if isinstance(sample, (int, float)) or (isinstance(sample, str) and sample.replace('.', '').isdigit()):
                        value_col = h
                        break
            
            if label_col and value_col:
                chart_data = {}
                for row in data[:15]:  # Limit to 15 items
                    label = str(row.get(label_col, ''))[:20]
                    val = row.get(value_col, 0)
                    if isinstance(val, str):
                        val = val.replace(',', '').replace('%', '')
                        try:
                            val = float(val)
                        except:
                            val = 0
                    if label and val:
                        chart_data[label] = val
                
                if chart_data:
                    output_path = charts_dir / f'chart_{i+1}.png'
                    try:
                        create_bar_chart(chart_data, title, output_path)
                        charts_generated += 1
                        print(f"    📊 chart_{i+1}.png")
                    except Exception as e:
                        print(f"    ❌ Error: {e}")
    
    return charts_generated


def main():
    print("=" * 60)
    print("توليد الرسوم البيانية من البيانات")
    print("=" * 60)
    
    total_charts = 0
    
    # Process each item with tables
    for item_dir in sorted(DATA_DIR.glob('item_*')):
        tables_file = item_dir / 'tables.json'
        if not tables_file.exists():
            continue
        
        item_code = item_dir.name.replace('item_', '').replace('_', '.')
        
        with open(tables_file, encoding='utf-8') as f:
            tables = json.load(f)
        
        if not tables:
            continue
        
        print(f"\n📍 {item_code}")
        charts = generate_charts_for_item(item_code, tables)
        total_charts += charts
    
    print("\n" + "=" * 60)
    print(f"Total charts generated: {total_charts}")


if __name__ == '__main__':
    main()
