"""
Django Management Command: generate_item

Usage:
    python manage.py generate_item 3.1 --format html
    python manage.py generate_item 3.1 --format docx
    python manage.py generate_item 3.1 --format pdf
    python manage.py generate_item 3.1 --format all
"""

import os
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from apps.templates_app.models import Item
from apps.reports.models import Project, TableData, ItemStructure
from apps.export.report_generator import ReportGenerator


class Command(BaseCommand):
    help = 'Generate report for a specific item (HTML, DOCX, PDF)'

    def add_arguments(self, parser):
        parser.add_argument(
            'item_code',
            type=str,
            help='Item code (e.g., 3.1)'
        )
        parser.add_argument(
            '--format',
            type=str,
            default='all',
            choices=['html', 'docx', 'pdf', 'all'],
            help='Output format (default: all)'
        )
        parser.add_argument(
            '--project',
            type=str,
            help='Project ID (uses first active project if not specified)'
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default='./output',
            help='Output directory (default: ./output)'
        )

    def handle(self, *args, **options):
        item_code = options['item_code']
        output_format = options['format']
        output_dir = Path(options['output_dir'])
        
        self.stdout.write(f"\n🚀 Generating report for item {item_code}...")
        
        # Find item
        items = Item.objects.filter(code=item_code)
        if not items.exists():
            # Try partial match
            items = Item.objects.filter(code__contains=item_code)
        
        if not items.exists():
            raise CommandError(f"Item with code '{item_code}' not found")
        
        item = items.first()
        self.stdout.write(f"   Found: {item.code} - {item.name}")
        
        # Find project
        if options['project']:
            try:
                from uuid import UUID
                project = Project.objects.get(id=UUID(options['project']))
            except:
                raise CommandError(f"Project '{options['project']}' not found")
        else:
            project = Project.objects.filter(status='active').first()
            if not project:
                project = Project.objects.first()
            if not project:
                raise CommandError("No project found. Create a project first.")
        
        self.stdout.write(f"   Project: {project.name}")
        
        # Find item structure
        try:
            item_structure = ItemStructure.objects.get(
                item=item,
                project=project
            )
        except ItemStructure.DoesNotExist:
            # Try without project
            item_structure = ItemStructure.objects.filter(item=item).first()
            if not item_structure:
                raise CommandError(f"No structure found for item {item_code}")
        
        self.stdout.write(f"   Structure: {len(item_structure.components or [])} components")
        
        # Create output directory
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate
        generator = ReportGenerator(
            project=project,
            output_dir=str(output_dir)
        )
        
        results = generator.generate_item(
            item_structure=item_structure,
            formats=output_format
        )
        
        # Output results
        self.stdout.write("\n✅ Generation complete!\n")
        
        for fmt, path in results.items():
            if path:
                size = os.path.getsize(path) / 1024
                self.stdout.write(
                    self.style.SUCCESS(f"   📄 {fmt.upper()}: {path} ({size:.1f} KB)")
                )
        
        self.stdout.write("")
