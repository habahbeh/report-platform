#!/usr/bin/env python3
"""
Generate test report with AI
"""
import os
import sys

# Add backend to path
sys.path.insert(0, '/Users/mohammadhabahbeh/Desktop/My File/Project/report-platform/backend')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from apps.reports.models import Project
from apps.export.report_template import generate_professional_report

print("🚀 توليد التقرير (المعيار الأول مع AI)...")
print()

project = Project.objects.get(id='775db688-bd2d-4a70-ae2a-2482ce1bcad6')
buffer = generate_professional_report(project, use_ai=True, axis_filter="1")

output_path = "/Users/mohammadhabahbeh/Desktop/تقرير_TEST.docx"
with open(output_path, 'wb') as f:
    f.write(buffer.getvalue())

print(f"✅ Done: {output_path}")

# Verify content
from docx import Document
doc = Document(output_path)
print("\n📄 Content preview:")
for para in doc.paragraphs:
    t = para.text.strip()
    if t and len(t) > 30 and "Invalid" not in t:
        print(f"  ✓ {t[:80]}...")
