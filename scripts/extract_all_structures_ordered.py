#!/usr/bin/env python3
"""
Extract exact structure of ALL items from the original Word document.
Preserves the real order of paragraphs, tables, and figures.
Saves to DB (ItemComponent) with correct ordering.
"""

import os
import sys
import re
import json
import django

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

from apps.templates_app.models import (
    Template, Item, ItemComponent,
    TableDefinition, ChartDefinition
)

# Path to the original report
REPORT_PATH = "/Users/mohammadhabahbeh/Desktop/report yearly/2023-2024/التقرير السنوي لجامعة البترا 2023-2024 حتى تاريخ 29.09.2025.docx"

# All item codes to extract
ITEM_CODES = [
    '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10',
    '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7',
    '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8',
    '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10', '4.11', '4.12', '4.13',
    '5.1', '5.2', '5.3', '5.4', '5.5',
    '6.1', '6.2', '6.3', '6.4', '6.5',
]


def iter_block_items(parent):
    """Iterate through paragraphs and tables in document order."""
    parent_elm = parent.element.body if isinstance(parent, DocumentType) else parent._element
    
    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield ('paragraph', Paragraph(child, parent))
        elif isinstance(child, CT_Tbl):
            yield ('table', Table(child, parent))


def is_item_header(text, item_code):
    """Check if this paragraph is the header for the given item."""
    patterns = [
        rf'^{re.escape(item_code)}\s*[:：]',
        rf'^{re.escape(item_code)}\s+\S',
    ]
    for pattern in patterns:
        if re.match(pattern, text.strip()):
            return True
    return False


def is_any_item_header(text):
    """Check if this is any item header and return the code."""
    patterns = [
        rf'^(\d+\.\d+)\s*[:：]',
        rf'^(\d+\.\d+)\s+[أ-ي\w]',
    ]
    for pattern in patterns:
        match = re.match(pattern, text.strip())
        if match:
            return match.group(1)
    return None


def classify_paragraph(text):
    """Classify a paragraph as figure reference, table reference, or text."""
    text = text.strip()
    
    # Check for figure/chart - ONLY if it STARTS with شكل
    # شكل (1-3): ... is a figure caption
    figure_match = re.match(r'^شكل\s*\((\d+-\d+)\)', text)
    if figure_match:
        return ('figure', figure_match.group(1), text)
    
    # Check for table - ONLY if it STARTS with جدول
    # جدول (3-1): ... is a table caption
    table_match = re.match(r'^جدول\s*\((\d+-\d+)\)', text)
    if table_match:
        return ('table_ref', table_match.group(1), text)
    
    return ('text', None, text)


def extract_table_info(table):
    """Extract info from a table."""
    rows = len(table.rows)
    cols = len(table.columns) if table.rows else 0
    
    # Get headers from first row
    headers = []
    if table.rows:
        for cell in table.rows[0].cells:
            headers.append(cell.text.strip()[:30])
    
    return {
        'rows': rows,
        'cols': cols,
        'headers': headers[:5],  # First 5 headers
    }


def extract_all_items(doc):
    """Extract structure of all items from document."""
    all_structures = {}
    current_item = None
    current_structure = []
    
    for block_type, block in iter_block_items(doc):
        if block_type == 'paragraph':
            text = block.text.strip()
            if not text:
                continue
            
            # Check if this is a new item header
            item_code = is_any_item_header(text)
            if item_code and item_code in ITEM_CODES:
                # Save previous item
                if current_item and current_structure:
                    all_structures[current_item] = current_structure
                
                # Start new item
                current_item = item_code
                current_structure = [{
                    'type': 'header',
                    'content': text[:200],
                    'full_text': text,
                }]
                continue
            
            # If we're in an item, process the content
            if current_item:
                ptype, ref_id, content = classify_paragraph(text)
                
                if ptype == 'figure':
                    current_structure.append({
                        'type': 'figure',
                        'id': ref_id,
                        'content': content[:150],
                        'full_text': content,
                    })
                elif ptype == 'table_ref':
                    current_structure.append({
                        'type': 'table_ref',
                        'id': ref_id,
                        'content': content[:150],
                        'full_text': content,
                    })
                else:
                    if len(text) > 15:  # Skip very short
                        current_structure.append({
                            'type': 'text',
                            'content': content[:150],
                            'full_text': content,
                        })
        
        elif block_type == 'table':
            if current_item:
                info = extract_table_info(block)
                current_structure.append({
                    'type': 'table',
                    'rows': info['rows'],
                    'cols': info['cols'],
                    'headers': info['headers'],
                })
    
    # Don't forget last item
    if current_item and current_structure:
        all_structures[current_item] = current_structure
    
    return all_structures


def save_to_db(all_structures, template):
    """Save structures to ItemComponent in database."""
    stats = {
        'items_saved': 0,
        'components_created': 0,
        'texts': 0,
        'tables': 0,
        'figures': 0,
    }
    
    for item_code, structure in all_structures.items():
        # Find item in DB
        try:
            item_obj = Item.objects.get(axis__template=template, code=item_code)
        except Item.DoesNotExist:
            print(f"  ⚠ Item {item_code} not found in DB")
            continue
        
        # Clear existing components
        ItemComponent.objects.filter(item=item_obj).delete()
        
        # Create components with correct order
        order = 0
        text_count = 0
        table_count = 0
        figure_count = 0
        
        for element in structure:
            if element['type'] == 'header':
                continue  # Skip header, it's in Item.name
            
            order += 1
            
            if element['type'] == 'text':
                text_count += 1
                ref_id = f"p{text_count}"
                ItemComponent.objects.create(
                    item=item_obj,
                    ref_id=ref_id,
                    component_type='text',
                    source='manual',
                    title=f"فقرة {text_count}",
                    config={
                        'preview': element['content'],
                        'full_text': element.get('full_text', ''),
                    },
                    order=order,
                    required=True,
                )
                stats['texts'] += 1
            
            elif element['type'] in ('table', 'table_ref'):
                table_count += 1
                ref_id = f"t{table_count}"
                
                config = {}
                if element['type'] == 'table':
                    config = {
                        'rows': element.get('rows'),
                        'cols': element.get('cols'),
                        'headers': element.get('headers', []),
                    }
                else:
                    config = {
                        'table_code': element.get('id'),
                        'title': element.get('content', ''),
                    }
                
                ItemComponent.objects.create(
                    item=item_obj,
                    ref_id=ref_id,
                    component_type='table',
                    source='manual',
                    title=element.get('content', f"جدول {table_count}")[:200],
                    config=config,
                    order=order,
                    required=True,
                )
                stats['tables'] += 1
            
            elif element['type'] == 'figure':
                figure_count += 1
                ref_id = f"c{figure_count}"
                
                ItemComponent.objects.create(
                    item=item_obj,
                    ref_id=ref_id,
                    component_type='chart',
                    source='manual',
                    title=element.get('content', f"شكل {figure_count}")[:200],
                    config={
                        'chart_code': element.get('id'),
                    },
                    order=order,
                    required=True,
                )
                stats['figures'] += 1
        
        stats['items_saved'] += 1
        stats['components_created'] += order
        
        print(f"  ✓ {item_code}: {order} components (📝{text_count} 📊{table_count} 📈{figure_count})")
    
    return stats


def generate_checklist(all_structures, template):
    """Generate comparison checklist."""
    checklist = []
    
    axes = {
        '1': 'الاعتمادية وضمان الجودة',
        '2': 'التدريس',
        '3': 'البحث العلمي',
        '4': 'إدارة الموارد البشرية',
        '5': 'البنية التحتية',
        '6': 'خدمة المجتمع',
    }
    
    for axis_code, axis_name in axes.items():
        axis_items = [code for code in ITEM_CODES if code.startswith(f"{axis_code}.")]
        
        axis_entry = {
            'axis': axis_code,
            'name': axis_name,
            'items': [],
            'totals': {'texts': 0, 'tables': 0, 'figures': 0, 'in_db': 0},
        }
        
        for item_code in axis_items:
            structure = all_structures.get(item_code, [])
            
            # Count elements
            texts = sum(1 for e in structure if e['type'] == 'text')
            tables = sum(1 for e in structure if e['type'] in ('table', 'table_ref'))
            figures = sum(1 for e in structure if e['type'] == 'figure')
            
            # Check DB
            try:
                item_obj = Item.objects.get(axis__template=template, code=item_code)
                db_count = item_obj.components.count()
            except Item.DoesNotExist:
                db_count = 0
            
            axis_entry['items'].append({
                'code': item_code,
                'word': {'texts': texts, 'tables': tables, 'figures': figures},
                'db': db_count,
                'match': db_count == (texts + tables + figures),
            })
            
            axis_entry['totals']['texts'] += texts
            axis_entry['totals']['tables'] += tables
            axis_entry['totals']['figures'] += figures
            axis_entry['totals']['in_db'] += db_count
        
        checklist.append(axis_entry)
    
    return checklist


def print_checklist(checklist):
    """Print the checklist in a nice format."""
    print("\n" + "=" * 70)
    print("📋 CHECKLIST: التقرير الأصلي vs قاعدة البيانات")
    print("=" * 70)
    
    total_word = 0
    total_db = 0
    all_match = True
    
    for axis in checklist:
        print(f"\n{'─' * 70}")
        print(f"📁 المحور {axis['axis']}: {axis['name']}")
        print(f"{'─' * 70}")
        print(f"{'البند':<8} {'📝 نص':<8} {'📊 جدول':<8} {'📈 شكل':<8} {'DB':<6} {'الحالة':<10}")
        print(f"{'─' * 70}")
        
        for item in axis['items']:
            w = item['word']
            word_total = w['texts'] + w['tables'] + w['figures']
            status = "✅" if item['match'] else "❌"
            
            print(f"{item['code']:<8} {w['texts']:<8} {w['tables']:<8} {w['figures']:<8} {item['db']:<6} {status:<10}")
            
            total_word += word_total
            total_db += item['db']
            if not item['match']:
                all_match = False
        
        t = axis['totals']
        axis_total = t['texts'] + t['tables'] + t['figures']
        print(f"{'─' * 70}")
        print(f"{'المجموع':<8} {t['texts']:<8} {t['tables']:<8} {t['figures']:<8} {t['in_db']:<6}")
    
    print("\n" + "=" * 70)
    print(f"📊 الإجمالي الكلي: Word={total_word} | DB={total_db} | {'✅ متطابق' if all_match else '❌ يوجد فرق'}")
    print("=" * 70)


def main():
    print("=" * 60)
    print("استخراج الهيكل الكامل من التقرير الأصلي")
    print("=" * 60)
    
    # Load document
    print("\n📄 تحميل ملف Word...")
    doc = Document(REPORT_PATH)
    
    # Extract all structures
    print("🔍 استخراج هيكل البنود...")
    all_structures = extract_all_items(doc)
    print(f"   تم استخراج {len(all_structures)} بند")
    
    # Save to JSON for reference
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ordered_structures.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        # Convert to JSON-serializable format
        json_data = {}
        for code, struct in all_structures.items():
            json_data[code] = struct
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    print(f"   💾 حُفظ في: ordered_structures.json")
    
    # Get template
    template = Template.objects.get(id=1)
    print(f"\n📁 القالب: {template.name}")
    
    # Save to DB
    print("\n💾 حفظ في قاعدة البيانات...")
    stats = save_to_db(all_structures, template)
    
    print(f"\n📊 الإحصائيات:")
    print(f"   البنود: {stats['items_saved']}")
    print(f"   المكونات: {stats['components_created']}")
    print(f"   📝 فقرات: {stats['texts']}")
    print(f"   📊 جداول: {stats['tables']}")
    print(f"   📈 أشكال: {stats['figures']}")
    
    # Generate and print checklist
    print("\n📋 إنشاء قائمة المقارنة...")
    checklist = generate_checklist(all_structures, template)
    print_checklist(checklist)
    
    # Save checklist to file
    checklist_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'structure_checklist.json')
    with open(checklist_path, 'w', encoding='utf-8') as f:
        json.dump(checklist, f, ensure_ascii=False, indent=2)
    print(f"\n💾 Checklist saved to: structure_checklist.json")


if __name__ == '__main__':
    main()
