#!/usr/bin/env python3
"""
Extract exact structure of an item from the original Word document.
Preserves the real order of paragraphs, tables, and figures.
"""

import os
import sys
import re
from docx import Document
from docx.document import Document as DocumentType
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

# Path to the original report
REPORT_PATH = "/Users/mohammadhabahbeh/Desktop/report yearly/2023-2024/التقرير السنوي لجامعة البترا 2023-2024 حتى تاريخ 29.09.2025.docx"


def iter_block_items(parent):
    """
    Iterate through paragraphs and tables in document order.
    Yields (type, element) tuples where type is 'paragraph' or 'table'.
    """
    parent_elm = parent.element.body if isinstance(parent, DocumentType) else parent._element
    
    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield ('paragraph', Paragraph(child, parent))
        elif isinstance(child, CT_Tbl):
            yield ('table', Table(child, parent))


def is_item_header(text, item_code):
    """Check if this paragraph is the header for the given item."""
    # Match patterns like "1.1:" or "1.1 :" or "1-1:" etc.
    patterns = [
        rf'^{item_code}\s*[:：]',
        rf'^{item_code.replace(".", "-")}\s*[:：]',
        rf'^{item_code}\s+\w',
    ]
    for pattern in patterns:
        if re.match(pattern, text.strip()):
            return True
    return False


def is_next_item_header(text, current_item):
    """Check if this paragraph is the start of a different item."""
    text = text.strip()
    
    # Pattern for next items - matches "3.2 معدل" or "3.2: عدد" etc.
    patterns = [
        rf'^(\d+\.\d+)\s*[:：]',  # 3.2: 
        rf'^(\d+\.\d+)\s+\S',     # 3.2 معدل (number followed by space and word)
    ]
    
    for pattern in patterns:
        match = re.match(pattern, text)
        if match:
            found_code = match.group(1)
            if found_code != current_item:
                return True
    
    # Also check for axis headers like "المحور الثاني"
    if re.match(r'^المحور\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس)', text):
        return True
    
    return False


def classify_paragraph(text):
    """Classify a paragraph as figure reference, table reference, or text."""
    text = text.strip()
    
    # Check for figure/chart reference
    figure_patterns = [
        r'^شكل\s*\(?(\d+-\d+)\)?',
        r'شكل\s*\((\d+-\d+)\)',
    ]
    for pattern in figure_patterns:
        match = re.search(pattern, text)
        if match:
            return ('figure', match.group(1), text)
    
    # Check for table reference in text
    table_patterns = [
        r'^جدول\s*\(?(\d+-\d+)\)?',
        r'جدول\s*\((\d+-\d+)\)',
    ]
    for pattern in table_patterns:
        match = re.search(pattern, text)
        if match:
            return ('table_ref', match.group(1), text)
    
    return ('text', None, text)


def extract_item_structure(item_code):
    """Extract the structure of a specific item."""
    print(f"Loading document...")
    doc = Document(REPORT_PATH)
    
    print(f"Searching for item {item_code}...")
    
    structure = []
    in_item = False
    
    for block_type, block in iter_block_items(doc):
        if block_type == 'paragraph':
            text = block.text.strip()
            if not text:
                continue
            
            # Check if we've reached our item
            if not in_item:
                if is_item_header(text, item_code):
                    in_item = True
                    structure.append({
                        'type': 'header',
                        'content': text[:100]
                    })
                continue
            
            # Check if we've moved to next item
            if is_next_item_header(text, item_code):
                break
            
            # Classify the paragraph
            ptype, ref_id, content = classify_paragraph(text)
            
            if ptype == 'figure':
                structure.append({
                    'type': 'figure',
                    'id': ref_id,
                    'content': content[:80]
                })
            elif ptype == 'table_ref':
                structure.append({
                    'type': 'table_ref',
                    'id': ref_id,
                    'content': content[:80]
                })
            else:
                # Regular text paragraph
                if len(text) > 20:  # Skip very short paragraphs
                    structure.append({
                        'type': 'text',
                        'content': text[:100] + ('...' if len(text) > 100 else '')
                    })
        
        elif block_type == 'table':
            if not in_item:
                continue
            
            # Get table info
            rows = len(block.rows)
            cols = len(block.columns) if block.rows else 0
            
            # Try to get first cell content for identification
            first_cell = ""
            if block.rows and block.rows[0].cells:
                first_cell = block.rows[0].cells[0].text[:30]
            
            structure.append({
                'type': 'table',
                'rows': rows,
                'cols': cols,
                'preview': first_cell
            })
    
    return structure


def print_structure(item_code, structure):
    """Print the structure in a nice format."""
    print(f"\n{'='*60}")
    print(f"البند {item_code}")
    print(f"{'='*60}")
    
    icons = {
        'header': '📌',
        'text': '📝',
        'table': '📊',
        'table_ref': '📊',
        'figure': '📈',
    }
    
    for i, item in enumerate(structure, 1):
        icon = icons.get(item['type'], '❓')
        
        if item['type'] == 'header':
            print(f"\n{icon} {item['content']}")
            print(f"{'─'*50}")
        elif item['type'] == 'text':
            print(f"├── {i}. {icon} نص: {item['content'][:60]}...")
        elif item['type'] == 'table':
            print(f"├── {i}. {icon} جدول ({item['rows']}×{item['cols']}): {item['preview']}")
        elif item['type'] == 'table_ref':
            print(f"├── {i}. {icon} مرجع جدول ({item['id']}): {item['content'][:50]}")
        elif item['type'] == 'figure':
            print(f"├── {i}. {icon} شكل ({item['id']}): {item['content'][:50]}")
    
    print(f"\nإجمالي: {len(structure)} عنصر")


if __name__ == '__main__':
    item_code = sys.argv[1] if len(sys.argv) > 1 else '1.1'
    
    structure = extract_item_structure(item_code)
    print_structure(item_code, structure)
