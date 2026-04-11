#!/usr/bin/env python3
"""
Complete All Items - Generate full reports for ALL items.

This script:
1. Updates ItemStructure.components from all_structures.json
2. Creates TableData for missing tables (demo data)
3. Generates HTML/Word/PDF for all items
"""

import os
import sys
import json
import django
from pathlib import Path
from datetime import datetime

# Setup Django
PROJECT_ROOT = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(PROJECT_ROOT))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.templates_app.models import Item, TableDefinition
from apps.reports.models import ItemStructure, TableData, Project
from apps.export.report_generator import ReportGenerator

# Paths
DATA_DIR = Path(__file__).parent.parent / 'data'
STRUCTURES_FILE = DATA_DIR / 'all_structures.json'


def load_structures():
    """Load all structures from JSON."""
    with open(STRUCTURES_FILE, encoding='utf-8') as f:
        return json.load(f)


def build_components(item_code, structure_data):
    """
    Build components list from structure data.
    
    Components format:
    [
        {"id": "p1", "type": "paragraph", "title": "...", "content": "..."},
        {"id": "c1", "type": "chart", "title": "...", "config": {...}},
        {"id": "t1", "type": "table", "title": "...", "table_def_id": ...},
    ]
    """
    components = []
    comp_counter = {'p': 0, 'c': 0, 't': 0}
    
    # Process texts (paragraphs)
    for text in structure_data.get('texts', []):
        comp_counter['p'] += 1
        components.append({
            'id': f"p{comp_counter['p']}",
            'type': 'paragraph',
            'title': f'فقرة {comp_counter["p"]}',
            'content': text[:500] if len(text) > 500 else text  # Limit length
        })
    
    # Process charts
    for chart in structure_data.get('charts', []):
        comp_counter['c'] += 1
        chart_id = chart.get('id', '')
        chart_title = chart.get('title', f'شكل {comp_counter["c"]}')
        
        components.append({
            'id': f"c{comp_counter['c']}",
            'type': 'chart',
            'title': chart_title[:200],
            'config': {
                'chart_type': 'bar',
                'original_id': chart_id
            }
        })
    
    # Process tables
    for table in structure_data.get('tables', []):
        comp_counter['t'] += 1
        table_id = table.get('id', '')
        table_title = table.get('title', f'جدول {comp_counter["t"]}')
        
        components.append({
            'id': f"t{comp_counter['t']}",
            'type': 'table',
            'title': table_title[:200],
            'config': {
                'original_id': table_id
            }
        })
    
    return components


def create_demo_table_data(project, item_code, table_title):
    """Create demo table data."""
    # Generate demo data based on table title
    if 'كلية' in table_title or 'كليات' in table_title:
        return [
            {'الكلية': 'كلية الصيدلة والعلوم الطبية', 'العدد': 45, 'النسبة': '18%'},
            {'الكلية': 'كلية تكنولوجيا المعلومات', 'العدد': 38, 'النسبة': '15%'},
            {'الكلية': 'كلية العلوم الإدارية والمالية', 'العدد': 52, 'النسبة': '21%'},
            {'الكلية': 'كلية الحقوق', 'العدد': 28, 'النسبة': '11%'},
            {'الكلية': 'كلية الآداب والعلوم', 'العدد': 42, 'النسبة': '17%'},
            {'الكلية': 'كلية الهندسة', 'العدد': 35, 'النسبة': '14%'},
            {'الكلية': 'كلية العمارة والتصميم', 'العدد': 10, 'النسبة': '4%'},
        ]
    elif 'سنة' in table_title or 'عام' in table_title or 'سنوات' in table_title:
        return [
            {'السنة': '2020', 'القيمة': 120, 'التغير': '+5%'},
            {'السنة': '2021', 'القيمة': 135, 'التغير': '+12%'},
            {'السنة': '2022', 'القيمة': 158, 'التغير': '+17%'},
            {'السنة': '2023', 'القيمة': 175, 'التغير': '+11%'},
            {'السنة': '2024', 'القيمة': 198, 'التغير': '+13%'},
        ]
    elif 'طلبة' in table_title or 'طالب' in table_title:
        return [
            {'الفئة': 'طلبة البكالوريوس', 'الذكور': 2450, 'الإناث': 3120, 'المجموع': 5570},
            {'الفئة': 'طلبة الماجستير', 'الذكور': 180, 'الإناث': 220, 'المجموع': 400},
            {'الفئة': 'طلبة الدبلوم', 'الذكور': 45, 'الإناث': 55, 'المجموع': 100},
        ]
    elif 'دورات' in table_title or 'تدريب' in table_title:
        return [
            {'الدورة': 'التعليم الإلكتروني', 'عدد المشاركين': 85, 'المدة': '3 أيام'},
            {'الدورة': 'البحث العلمي', 'عدد المشاركين': 62, 'المدة': '5 أيام'},
            {'الدورة': 'مهارات التدريس', 'عدد المشاركين': 48, 'المدة': '2 يوم'},
            {'الدورة': 'الذكاء الاصطناعي', 'عدد المشاركين': 95, 'المدة': '4 أيام'},
        ]
    elif 'موازنة' in table_title or 'مالي' in table_title or 'إيرادات' in table_title:
        return [
            {'البند': 'الرسوم الدراسية', 'المبلغ': '12,500,000', 'النسبة': '65%'},
            {'البند': 'المنح والدعم', 'المبلغ': '3,200,000', 'النسبة': '17%'},
            {'البند': 'الاستشارات والخدمات', 'المبلغ': '2,100,000', 'النسبة': '11%'},
            {'البند': 'إيرادات أخرى', 'المبلغ': '1,400,000', 'النسبة': '7%'},
        ]
    elif 'اعتماد' in table_title or 'برنامج' in table_title:
        return [
            {'البرنامج': 'علم الحاسوب', 'نوع الاعتماد': 'ABET', 'السنة': '2018', 'الحالة': 'مجدد'},
            {'البرنامج': 'الصيدلة', 'نوع الاعتماد': 'ACPE', 'السنة': '2018', 'الحالة': 'مجدد'},
            {'البرنامج': 'الهندسة المدنية', 'نوع الاعتماد': 'ABET', 'السنة': '2023', 'الحالة': 'فعال'},
            {'البرنامج': 'إدارة الأعمال', 'نوع الاعتماد': 'ASIC', 'السنة': '2022', 'الحالة': 'فعال'},
        ]
    else:
        # Generic demo data
        return [
            {'العنصر': 'البند الأول', 'القيمة': 100, 'ملاحظات': 'تم الإنجاز'},
            {'العنصر': 'البند الثاني', 'القيمة': 150, 'ملاحظات': 'قيد التنفيذ'},
            {'العنصر': 'البند الثالث', 'القيمة': 200, 'ملاحظات': 'تم الإنجاز'},
            {'العنصر': 'البند الرابع', 'القيمة': 175, 'ملاحظات': 'تم الإنجاز'},
        ]


def create_demo_chart_data(item_code):
    """Create demo chart data JSON file."""
    return {
        'years': ['2020', '2021', '2022', '2023', '2024'],
        'values': [85, 92, 108, 125, 145],
        'cumulative': [85, 177, 285, 410, 555]
    }


def update_item_structure(item, components):
    """Update or create ItemStructure with new components."""
    try:
        structure = ItemStructure.objects.get(item=item)
        structure.components = components
        structure.save()
        return structure, False
    except ItemStructure.DoesNotExist:
        # Need project
        project = Project.objects.first()
        if not project:
            print("ERROR: No project found!")
            return None, False
        
        structure = ItemStructure.objects.create(
            item=item,
            project=project,
            components=components
        )
        return structure, True


def generate_item_report(item_structure, output_dir):
    """Generate report for an item."""
    project = item_structure.project
    generator = ReportGenerator(project, str(output_dir))
    
    results = {}
    
    # Generate HTML first
    try:
        html_results = generator.generate_item(item_structure, formats='html')
        results.update(html_results)
    except Exception as e:
        print(f"  ERROR generating HTML: {e}")
    
    # Generate DOCX
    try:
        docx_results = generator.generate_item(item_structure, formats='docx')
        results.update(docx_results)
    except Exception as e:
        print(f"  ERROR generating DOCX: {e}")
    
    # Skip PDF for now (can cause segfaults)
    # try:
    #     pdf_results = generator.generate_item(item_structure, formats='pdf')
    #     results.update(pdf_results)
    # except Exception as e:
    #     print(f"  ERROR generating PDF: {e}")
    
    return results if results else None


def main():
    print("=" * 60)
    print("COMPLETE ALL ITEMS - Full Report Generation")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Load structures
    print("Loading structures from JSON...")
    structures = load_structures()
    print(f"Found {len(structures)} item structures")
    print()
    
    # Get project
    project = Project.objects.first()
    if not project:
        print("ERROR: No project found!")
        return
    print(f"Project: {project.name}")
    print()
    
    # Stats
    stats = {
        'total': len(structures),
        'updated': 0,
        'created': 0,
        'generated': 0,
        'errors': 0
    }
    
    # Process each item
    for item_code, structure_data in structures.items():
        print(f"\n{'='*50}")
        print(f"Processing: {item_code}")
        print(f"{'='*50}")
        
        # Find item (filter by axis 1-6 to avoid duplicates)
        try:
            item = Item.objects.filter(code=item_code, axis_id__lte=6).first()
            if not item:
                item = Item.objects.filter(code=item_code).first()
            if not item:
                print(f"  WARNING: Item {item_code} not found in database")
                stats['errors'] += 1
                continue
        except Exception as e:
            print(f"  WARNING: Error finding item {item_code}: {e}")
            stats['errors'] += 1
            continue
        
        # Build components
        components = build_components(item_code, structure_data)
        print(f"  Components: {len(components)} (p:{sum(1 for c in components if c['type']=='paragraph')}, c:{sum(1 for c in components if c['type']=='chart')}, t:{sum(1 for c in components if c['type']=='table')})")
        
        # Update ItemStructure
        item_structure, is_new = update_item_structure(item, components)
        if item_structure:
            if is_new:
                stats['created'] += 1
                print(f"  Created ItemStructure")
            else:
                stats['updated'] += 1
                print(f"  Updated ItemStructure")
        else:
            stats['errors'] += 1
            continue
        
        # Prepare output directory
        item_code_safe = item_code.replace('.', '_')
        output_dir = DATA_DIR / f'item_{item_code_safe}'
        output_dir.mkdir(exist_ok=True)
        
        # Save chart data JSON
        chart_data = create_demo_chart_data(item_code)
        chart_file = output_dir / 'chart_data.json'
        with open(chart_file, 'w', encoding='utf-8') as f:
            json.dump(chart_data, f, ensure_ascii=False, indent=2)
        
        # Save generated texts (from components)
        texts = {c['id']: {'content': c.get('content', '')} 
                 for c in components if c['type'] == 'paragraph'}
        texts_file = output_dir / 'generated_texts.json'
        with open(texts_file, 'w', encoding='utf-8') as f:
            json.dump(texts, f, ensure_ascii=False, indent=2)
        
        # Generate report
        results = generate_item_report(item_structure, output_dir)
        if results:
            stats['generated'] += 1
            formats = []
            if results.get('html'): formats.append('HTML')
            if results.get('docx'): formats.append('DOCX')
            if results.get('pdf'): formats.append('PDF')
            print(f"  Generated: {', '.join(formats) if formats else 'None'}")
        else:
            stats['errors'] += 1
            print(f"  FAILED to generate")
    
    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total items: {stats['total']}")
    print(f"Updated: {stats['updated']}")
    print(f"Created: {stats['created']}")
    print(f"Generated: {stats['generated']}")
    print(f"Errors: {stats['errors']}")
    print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == '__main__':
    main()
