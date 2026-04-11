#!/usr/bin/env python3
"""
Extract tables from Word by finding table titles in paragraphs.
"""

import json
import re
import sys
from pathlib import Path
from docx import Document
from docx.document import Document as DocType
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

REPORT_PATH = Path(__file__).parent.parent / "habahbeh/التقرير السنوي لجامعة البترا 2023-2024 حتى تاريخ 29.09.2025.docx"
DATA_DIR = Path(__file__).parent.parent / "data"


def iter_block_items(parent):
    """Iterate through paragraphs and tables in document order."""
    parent_elm = parent.element.body
    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)


def extract_table_data(table):
    """Extract data from a Word table."""
    data = []
    headers = []
    
    for i, row in enumerate(table.rows):
        row_data = [cell.text.strip() for cell in row.cells]
        
        if i == 0:
            headers = row_data
        else:
            if headers:
                row_dict = {headers[j] if j < len(headers) else f'col_{j}': val 
                           for j, val in enumerate(row_data)}
                data.append(row_dict)
    
    return {'headers': headers, 'rows': data}


def find_item_code(text):
    """Find item code like 3.8 or ٣.٨ in text."""
    # Arabic to English number mapping
    ar_to_en = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
    text_en = text.translate(ar_to_en)
    
    # Match patterns like "3.8:" or "٣.٨:" at start
    match = re.match(r'^(\d+)\.(\d+)\s*[:\.]', text_en.strip())
    if match:
        return f"{match.group(1)}.{match.group(2)}"
    return None


def find_table_id(text):
    """Find table ID like جدول (3-13) or (3-13) in text."""
    # Pattern for جدول (X-Y)
    patterns = [
        r'جدول\s*\(?(\d+)[–\-](\d+)\)?',
        r'الجدول\s*\(?(\d+)[–\-](\d+)\)?',
        r'\((\d+)[–\-](\d+)\)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return f"{match.group(1)}-{match.group(2)}"
    return None


def table_id_to_item(table_id):
    """Map table ID to item code."""
    mapping = {
        # Axis 1
        '1-1': '1.1', '1-2': '1.7', '1-3': '1.9', '1-4': '1.9', '1-5': '1.9',
        '1-6': '1.10', '1-7': '1.10',
        # Axis 2
        '2-1': '2.2', '2-2': '2.5', '2-3': '2.5', '2-4': '2.5', '2-5': '2.5',
        '6-2': '2.7', '2-6': '2.7', '7-2': '2.7', '2-7': '2.7', '8-2': '2.7', '2-8': '2.7',
        # Axis 3
        '3-1': '3.1', '2-3': '3.1', '3-3': '3.1',
        '4-3': '3.3', '3-4': '3.3', '5-3': '3.3', '3-5': '3.3', '6-3': '3.3', '3-6': '3.3', '7-3': '3.3', '3-7': '3.3',
        '8-3': '3.7', '3-8': '3.7', '9-3': '3.7', '3-9': '3.7', '10-3': '3.7', '3-10': '3.7',
        '11-3': '3.7', '3-11': '3.7', '12-3': '3.7', '3-12': '3.7',
        '13-3': '3.8', '3-13': '3.8', '14-3': '3.8', '3-14': '3.8', '15-3': '3.8', '3-15': '3.8',
        # Axis 4
        '4-1': '4.2', '4-2': '4.2', '4-3': '4.3', '4-7': '4.7',
        # Axis 5
        '5-1': '5.3', '5-2': '5.3', '5-3': '5.3', '5-4': '5.4', '5-5': '5.5',
        # Axis 6
        '6-1': '6.1', '6-4': '6.4',
    }
    return mapping.get(table_id)


def main():
    print("=" * 60)
    print("استخراج الجداول مع عناوينها")
    print("=" * 60)
    
    doc = Document(str(REPORT_PATH))
    
    current_item = None
    pending_table_id = None
    pending_table_title = None
    
    item_tables = {}
    table_count = 0
    matched_count = 0
    
    for block in iter_block_items(doc):
        if isinstance(block, Paragraph):
            text = block.text.strip()
            if not text:
                continue
            
            # Check for item header like "3.8: ..."
            item_code = find_item_code(text)
            if item_code:
                current_item = item_code
                print(f"\n📍 Item {current_item}")
            
            # Check for table reference
            table_id = find_table_id(text)
            if table_id:
                pending_table_id = table_id
                pending_table_title = text[:100]
                
        elif isinstance(block, Table):
            table_count += 1
            rows = len(block.rows)
            
            if rows < 2:
                continue
            
            # Determine which item this table belongs to
            target_item = None
            table_title = ""
            
            if pending_table_id:
                target_item = table_id_to_item(pending_table_id)
                table_title = pending_table_title or f"جدول {pending_table_id}"
                pending_table_id = None
                pending_table_title = None
            elif current_item:
                target_item = current_item
                table_title = f"جدول في البند {current_item}"
            
            if target_item:
                matched_count += 1
                
                if target_item not in item_tables:
                    item_tables[target_item] = []
                
                table_data = extract_table_data(block)
                item_tables[target_item].append({
                    'title': table_title,
                    'rows': len(table_data['rows']),
                    'headers': table_data['headers'],
                    'data': table_data['rows'][:100]  # Limit
                })
                
                print(f"  ✅ Table → {target_item}: {len(table_data['rows'])} rows")
    
    # Save tables per item
    print("\n" + "=" * 60)
    print("حفظ الجداول...")
    
    for item_code, tables in item_tables.items():
        code_safe = item_code.replace('.', '_')
        item_dir = DATA_DIR / f"item_{code_safe}"
        item_dir.mkdir(exist_ok=True)
        
        # Save all tables for this item
        tables_file = item_dir / "tables.json"
        with open(tables_file, 'w', encoding='utf-8') as f:
            json.dump(tables, f, ensure_ascii=False, indent=2)
        
        print(f"  {item_code}: {len(tables)} tables → {tables_file.name}")
    
    print(f"\nTotal: {matched_count}/{table_count} tables matched")
    
    # Summary
    print("\n" + "=" * 60)
    print("ملخص الاستخراج:")
    for item_code in sorted(item_tables.keys()):
        tables = item_tables[item_code]
        total_rows = sum(t['rows'] for t in tables)
        print(f"  {item_code}: {len(tables)} جداول، {total_rows} صف")


if __name__ == '__main__':
    main()
