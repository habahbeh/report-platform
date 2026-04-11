#!/usr/bin/env python3
"""
Import item structure from precise_structure.json into ItemComponent model.

This script:
1. Reads the extracted structure from the original report
2. Creates ItemComponent records for each item with proper ordering
3. Links to existing TableDefinition and ChartDefinition where possible
"""

import os
import sys
import json
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.templates_app.models import (
    Template, Axis, Item, ItemComponent,
    TableDefinition, ChartDefinition
)


def load_structure():
    """Load the extracted structure from JSON."""
    structure_path = os.path.join(
        os.path.dirname(__file__), '..', 'data', 'precise_structure.json'
    )
    with open(structure_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def normalize_table_code(table_id):
    """Convert table ID like '3-1' to match DB format."""
    if not table_id:
        return None
    # Handle various formats: "3-1", "1-1", etc.
    return table_id.strip()


def find_table_definition(template, table_info):
    """Find matching TableDefinition in DB."""
    table_id = table_info.get('id')
    if not table_id:
        return None
    
    # Try exact match first
    try:
        return TableDefinition.objects.get(template=template, code=table_id)
    except TableDefinition.DoesNotExist:
        pass
    
    # Try with different formats
    for fmt in [table_id, table_id.replace('-', '_'), f"table_{table_id}"]:
        try:
            return TableDefinition.objects.get(template=template, code=fmt)
        except TableDefinition.DoesNotExist:
            pass
    
    return None


def find_chart_definition(template, figure_info):
    """Find matching ChartDefinition in DB."""
    figure_id = figure_info.get('id')
    if not figure_id:
        return None
    
    # Try exact match first
    try:
        return ChartDefinition.objects.get(template=template, code=figure_id)
    except ChartDefinition.DoesNotExist:
        pass
    
    # Try with different formats
    for fmt in [figure_id, figure_id.replace('-', '_'), f"chart_{figure_id}"]:
        try:
            return ChartDefinition.objects.get(template=template, code=fmt)
        except ChartDefinition.DoesNotExist:
            pass
    
    return None


def create_components_for_item(item_obj, item_structure, template):
    """Create ItemComponent records for a single item."""
    
    # Clear existing components
    ItemComponent.objects.filter(item=item_obj).delete()
    
    paragraphs = item_structure.get('paragraphs', [])
    tables = item_structure.get('tables', [])
    figures = item_structure.get('figures', [])
    
    components_created = []
    order = 0
    
    # Strategy: Interleave components based on typical report structure
    # 1. First paragraph (intro)
    # 2. First table with its associated figure if any
    # 3. More paragraphs/tables/figures in order
    
    # For now, use simple ordering: paragraphs → tables → figures
    # TODO: Could use AI to determine optimal order based on content
    
    # Create paragraph components
    for i, para_text in enumerate(paragraphs):
        order += 1
        ref_id = f"p{i+1}"
        
        component = ItemComponent.objects.create(
            item=item_obj,
            ref_id=ref_id,
            component_type='text',
            source='manual',  # From original report
            title=f"فقرة {i+1}",
            config={'original_text': para_text[:500]},  # Store first 500 chars
            order=order,
            required=True
        )
        components_created.append(('paragraph', ref_id))
    
    # Create table components
    for i, table_info in enumerate(tables):
        order += 1
        ref_id = f"t{i+1}"
        table_id = table_info.get('id', '')
        table_title = table_info.get('title', f'جدول {i+1}')
        
        # Try to find matching TableDefinition
        table_def = find_table_definition(template, table_info)
        
        component = ItemComponent.objects.create(
            item=item_obj,
            ref_id=ref_id,
            component_type='table',
            source='reference' if table_def else 'manual',
            table_ref=table_def,
            title=table_title[:200],
            config={'table_code': table_id},
            order=order,
            required=True
        )
        components_created.append(('table', ref_id, table_id))
    
    # Create figure/chart components
    for i, fig_info in enumerate(figures):
        order += 1
        ref_id = f"c{i+1}"
        fig_id = fig_info.get('id', '')
        fig_title = fig_info.get('title', f'شكل {i+1}')
        
        # Try to find matching ChartDefinition
        chart_def = find_chart_definition(template, fig_info)
        
        component = ItemComponent.objects.create(
            item=item_obj,
            ref_id=ref_id,
            component_type='chart',
            source='reference' if chart_def else 'manual',
            chart_ref=chart_def,
            title=fig_title[:200],
            config={'chart_code': fig_id},
            order=order,
            required=True
        )
        components_created.append(('chart', ref_id, fig_id))
    
    return components_created


def main():
    """Main function to import structure."""
    print("=" * 60)
    print("Importing Item Structure to Database")
    print("=" * 60)
    
    # Load structure
    structure = load_structure()
    items_data = structure.get('items', {})
    
    print(f"\nFound {len(items_data)} items in structure file")
    print(f"Stats: {structure.get('stats', {})}")
    
    # Get template
    template = Template.objects.get(id=1)
    print(f"\nUsing template: {template.name}")
    
    # Get existing counts
    existing_tables = TableDefinition.objects.filter(template=template).count()
    existing_charts = ChartDefinition.objects.filter(template=template).count()
    print(f"Existing TableDefinitions: {existing_tables}")
    print(f"Existing ChartDefinitions: {existing_charts}")
    
    # Process each item
    stats = {
        'items_processed': 0,
        'items_not_found': [],
        'components_created': 0,
        'paragraphs': 0,
        'tables': 0,
        'charts': 0,
        'tables_linked': 0,
        'charts_linked': 0,
    }
    
    for item_code, item_structure in items_data.items():
        # Find item in DB
        try:
            item_obj = Item.objects.get(axis__template=template, code=item_code)
        except Item.DoesNotExist:
            stats['items_not_found'].append(item_code)
            print(f"  ⚠ Item {item_code} not found in DB")
            continue
        
        # Create components
        components = create_components_for_item(item_obj, item_structure, template)
        
        stats['items_processed'] += 1
        stats['components_created'] += len(components)
        
        for comp in components:
            if comp[0] == 'paragraph':
                stats['paragraphs'] += 1
            elif comp[0] == 'table':
                stats['tables'] += 1
            elif comp[0] == 'chart':
                stats['charts'] += 1
        
        print(f"  ✓ {item_code}: {len(components)} components")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Items processed: {stats['items_processed']}")
    print(f"Items not found: {len(stats['items_not_found'])}")
    if stats['items_not_found']:
        print(f"  Missing: {', '.join(stats['items_not_found'])}")
    print(f"\nComponents created: {stats['components_created']}")
    print(f"  - Paragraphs: {stats['paragraphs']}")
    print(f"  - Tables: {stats['tables']}")
    print(f"  - Charts: {stats['charts']}")
    
    # Verify
    total_components = ItemComponent.objects.filter(item__axis__template=template).count()
    print(f"\nTotal ItemComponents in DB: {total_components}")


if __name__ == '__main__':
    main()
