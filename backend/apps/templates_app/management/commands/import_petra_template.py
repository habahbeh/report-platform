"""
Management command to import Petra University template from JSON files.

Usage:
    python manage.py import_petra_template --path=/path/to/platform/folder
"""

import json
from pathlib import Path
from django.core.management.base import BaseCommand
from apps.templates_app.models import Template, Axis, Item, Entity
from apps.organizations.models import Organization


class Command(BaseCommand):
    help = 'Import Petra University annual report template from JSON files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--path',
            type=str,
            default='/Users/mohammadhabahbeh/Desktop/report yearly/platform',
            help='Path to folder containing KPIS.json and ENTITIES.json'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing template before importing'
        )

    def handle(self, *args, **options):
        base_path = Path(options['path'])
        kpis_file = base_path / 'KPIS.json'
        entities_file = base_path / 'ENTITIES.json'
        
        # Validate files exist
        if not kpis_file.exists():
            self.stderr.write(self.style.ERROR(f'KPIS.json not found at {kpis_file}'))
            return
        if not entities_file.exists():
            self.stderr.write(self.style.ERROR(f'ENTITIES.json not found at {entities_file}'))
            return
        
        # Load JSON data
        with open(kpis_file, 'r', encoding='utf-8') as f:
            kpis_data = json.load(f)
        
        with open(entities_file, 'r', encoding='utf-8') as f:
            entities_data = json.load(f)
        
        self.stdout.write(f"Loaded {kpis_data.get('total_kpis', 0)} KPIs and {entities_data.get('total_entities', 0)} entities")
        
        # Get or create organization
        org, created = Organization.objects.get_or_create(
            name='جامعة البترا',
            defaults={
                'name_en': 'University of Petra',
                'short_name': 'UOP',
                'description': 'جامعة البترا - الأردن',
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created organization: {org.name}'))
        
        # Clear existing if requested
        if options['clear']:
            Template.objects.filter(name='التقرير السنوي للجامعات الأردنية').delete()
            self.stdout.write('Cleared existing template')
        
        # Create template
        template, created = Template.objects.get_or_create(
            name='التقرير السنوي للجامعات الأردنية',
            defaults={
                'name_en': 'Jordanian Universities Annual Report',
                'description': 'قالب التقرير السنوي الموحد للجامعات الأردنية - يشمل جميع المحاور والمؤشرات',
                'category': 'higher_education',
                'organization': org,
                'is_public': True,
                'is_default': True,
                'version': kpis_data.get('version', '1.0'),
            }
        )
        
        if not created:
            self.stdout.write(f'Template already exists: {template.name}')
            if not options['clear']:
                self.stdout.write('Use --clear to recreate')
                return
        else:
            self.stdout.write(self.style.SUCCESS(f'Created template: {template.name}'))
        
        # Create Axes and Items from KPIS.json
        item_map = {}  # code -> Item
        axes = kpis_data.get('axes', [])
        
        for axis_data in axes:
            axis, _ = Axis.objects.get_or_create(
                template=template,
                code=axis_data['code'],
                defaults={
                    'name': axis_data['name'],
                    'name_en': axis_data.get('name_en', ''),
                    'order': int(axis_data['code']),
                }
            )
            self.stdout.write(f'  Axis {axis.code}: {axis.name}')
            
            for i, item_data in enumerate(axis_data.get('items', [])):
                item, _ = Item.objects.get_or_create(
                    axis=axis,
                    code=item_data['code'],
                    defaults={
                        'name': item_data['name'],
                        'name_en': item_data.get('name_en', ''),
                        'description': item_data.get('description', ''),
                        'field_type': item_data.get('field_type', 'number'),
                        'unit': item_data.get('unit', ''),
                        'required': item_data.get('required', True),
                        'aggregation': item_data.get('aggregation') or 'none',
                        'formula': item_data.get('formula') or '',
                        'notes': item_data.get('notes', ''),
                        'order': i,
                        'config': item_data.get('config', {}),
                    }
                )
                item_map[item_data['code']] = item
        
        self.stdout.write(self.style.SUCCESS(f'Created {len(item_map)} items'))
        
        # Create Entities from ENTITIES.json
        entities = entities_data.get('entities', [])
        entity_map = {}  # id -> Entity
        
        for entity_data in entities:
            entity, _ = Entity.objects.get_or_create(
                template=template,
                name=entity_data['name'],
                defaults={
                    'name_en': entity_data.get('name_en', ''),
                    'contact_role': entity_data.get('contact_role', ''),
                    'priority': entity_data.get('priority', 'medium'),
                    'is_college': entity_data.get('is_college', False),
                    'notes': entity_data.get('notes', ''),
                }
            )
            entity_map[entity_data['id']] = entity
            
            # Link items to entity
            responsible_for = entity_data.get('responsible_for', {})
            kpi_codes = responsible_for.get('kpis', [])
            
            for kpi_code in kpi_codes:
                if kpi_code in item_map:
                    entity.items.add(item_map[kpi_code])
            
            self.stdout.write(f'  Entity: {entity.name} ({len(kpi_codes)} KPIs)')
        
        self.stdout.write(self.style.SUCCESS(f'Created {len(entity_map)} entities'))
        
        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS(f'Import Complete!'))
        self.stdout.write(self.style.SUCCESS(f'  Template: {template.name}'))
        self.stdout.write(self.style.SUCCESS(f'  Axes: {template.axes_count}'))
        self.stdout.write(self.style.SUCCESS(f'  Items: {template.items_count}'))
        self.stdout.write(self.style.SUCCESS(f'  Entities: {template.entities_count}'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
