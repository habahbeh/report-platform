#!/usr/bin/env python3
"""
Extract PRECISE structure from the original Word report.
- Every table with exact ID and title
- Every chart/figure with exact ID and title
- Every paragraph
- Organized by item code
"""

import json
import re
import sys
from pathlib import Path
from collections import defaultdict
from docx import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

REPORT_PATH = Path(__file__).parent.parent / "habahbeh/التقرير السنوي لجامعة البترا 2023-2024 حتى تاريخ 29.09.2025.docx"
DATA_DIR = Path(__file__).parent.parent / 'data'
OUTPUT_FILE = DATA_DIR / 'precise_structure.json'


def iter_block_items(parent):
    """Iterate through document elements in order."""
    for child in parent.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield ('paragraph', Paragraph(child, parent))
        elif isinstance(child, CT_Tbl):
            yield ('table', Table(child, parent))


def extract_item_code(text):
    """Extract item code like 3.8 from text."""
    # Convert Arabic numerals
    ar_to_en = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
    text_en = text.translate(ar_to_en)
    
    # Pattern: X.Y: or X.Y :
    match = re.match(r'^(\d+)\.(\d+)\s*[:.]', text_en.strip())
    if match:
        return f"{match.group(1)}.{match.group(2)}"
    return None


def extract_table_info(text):
    """Extract table ID like جدول (3-13) from text."""
    patterns = [
        r'جدول\s*\(?\s*(\d+)\s*[-–]\s*(\d+)\s*\)?',
        r'الجدول\s*\(?\s*(\d+)\s*[-–]\s*(\d+)\s*\)?',
        r'جدول\s+رقم\s*\(?\s*(\d+)\s*[-–]\s*(\d+)\s*\)?',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return {
                'id': f"{match.group(1)}-{match.group(2)}",
                'title': text.strip()[:200]
            }
    return None


def extract_figure_info(text):
    """Extract figure/chart ID like شكل (3-1) from text."""
    patterns = [
        r'شكل\s*\(?\s*(\d+)\s*[-–]\s*(\d+)\s*\)?',
        r'الشكل\s*\(?\s*(\d+)\s*[-–]\s*(\d+)\s*\)?',
        r'شكل\s+رقم\s*\(?\s*(\d+)\s*[-–]\s*(\d+)\s*\)?',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return {
                'id': f"{match.group(1)}-{match.group(2)}",
                'title': text.strip()[:200]
            }
    return None


def extract_table_data(table):
    """Extract actual data from a table."""
    rows_data = []
    headers = []
    
    for i, row in enumerate(table.rows):
        cells = [cell.text.strip() for cell in row.cells]
        
        if i == 0:
            headers = cells
        else:
            if headers:
                row_dict = {headers[j] if j < len(headers) else f'col_{j}': v 
                           for j, v in enumerate(cells)}
                rows_data.append(row_dict)
    
    return {
        'headers': headers,
        'row_count': len(rows_data),
        'data': rows_data[:200]  # Limit for storage
    }


def main():
    print("=" * 70)
    print("استخراج الهيكل الدقيق من التقرير الأصلي")
    print("=" * 70)
    
    doc = Document(str(REPORT_PATH))
    
    # Structure storage
    items = defaultdict(lambda: {
        'title': '',
        'paragraphs': [],
        'tables': [],
        'figures': [],
        'table_data': []
    })
    
    current_item = None
    pending_table_info = None
    pending_figure_info = None
    
    # Stats
    total_paragraphs = 0
    total_tables = 0
    total_figures = 0
    
    print("\nمسح المستند...")
    
    for block_type, block in iter_block_items(doc):
        
        if block_type == 'paragraph':
            text = block.text.strip()
            if not text:
                continue
            
            # Check for item header
            item_code = extract_item_code(text)
            if item_code:
                current_item = item_code
                items[current_item]['title'] = text[:150]
                print(f"\n📍 البند {current_item}")
                continue
            
            # Check for table reference
            table_info = extract_table_info(text)
            if table_info:
                pending_table_info = table_info
                if current_item:
                    items[current_item]['tables'].append(table_info)
                    total_tables += 1
                    print(f"   📋 جدول {table_info['id']}")
                continue
            
            # Check for figure reference
            figure_info = extract_figure_info(text)
            if figure_info:
                pending_figure_info = figure_info
                if current_item:
                    items[current_item]['figures'].append(figure_info)
                    total_figures += 1
                    print(f"   📊 شكل {figure_info['id']}")
                continue
            
            # Regular paragraph
            if current_item and len(text) > 20:
                items[current_item]['paragraphs'].append(text[:500])
                total_paragraphs += 1
        
        elif block_type == 'table':
            if len(block.rows) < 2:
                continue
            
            # Extract table data
            table_data = extract_table_data(block)
            
            if current_item:
                table_entry = {
                    'info': pending_table_info,
                    'headers': table_data['headers'],
                    'row_count': table_data['row_count'],
                    'data': table_data['data']
                }
                items[current_item]['table_data'].append(table_entry)
            
            pending_table_info = None
    
    # Convert to regular dict
    items_dict = dict(items)
    
    # Save to JSON
    output = {
        'extracted_at': '2026-04-04',
        'source': 'التقرير السنوي لجامعة البترا 2023-2024',
        'stats': {
            'total_items': len(items_dict),
            'total_paragraphs': total_paragraphs,
            'total_tables': total_tables,
            'total_figures': total_figures
        },
        'items': items_dict
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 70)
    print("ملخص الاستخراج:")
    print(f"  📁 البنود: {len(items_dict)}")
    print(f"  📝 الفقرات: {total_paragraphs}")
    print(f"  📋 الجداول: {total_tables}")
    print(f"  📊 الأشكال: {total_figures}")
    print(f"\nحُفظ في: {OUTPUT_FILE}")
    
    # Generate detailed checklist
    print("\n" + "=" * 70)
    print("CHECKLIST التفصيلي:")
    print("=" * 70)
    
    for item_code in sorted(items_dict.keys(), key=lambda x: (int(x.split('.')[0]), int(x.split('.')[1]))):
        item = items_dict[item_code]
        p_count = len(item['paragraphs'])
        t_count = len(item['tables'])
        f_count = len(item['figures'])
        d_count = len(item['table_data'])
        
        print(f"\n{item_code}: {item['title'][:50]}...")
        print(f"   📝 {p_count} فقرة | 📋 {t_count} جدول | 📊 {f_count} شكل | 💾 {d_count} جدول ببيانات")
        
        for t in item['tables']:
            print(f"      - جدول {t['id']}: {t['title'][:60]}...")
        
        for f in item['figures']:
            print(f"      - شكل {f['id']}: {f['title'][:60]}...")


if __name__ == '__main__':
    main()
