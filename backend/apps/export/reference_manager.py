"""
ReferenceManager — إدارة ترقيم الجداول والأشكال وحل المراجع

يعمل عند التصدير فقط:
1. يمشي على كل المحاور والبنود بالترتيب
2. يرقّم الجداول: جدول (كود_المحور-تسلسل) مثل جدول (1-3)
3. يرقّم الأشكال: شكل (كود_المحور-تسلسل) مثل شكل (2-1)
4. يستبدل {ref:t1} → جدول (1-3) في النصوص المولّدة
5. يكشف المراجع المكسورة

المبدأ: GeneratedContent.content يحفظ {ref:xx} كما هي.
الاستبدال يحصل عند العرض/التصدير فقط.
"""

import re
from typing import List, Dict, Optional

from apps.reports.models import Project, ItemStructure


class ReferenceManager:
    """
    إدارة ترقيم المراجع (جداول وأشكال) عند التصدير

    Usage:
        manager = ReferenceManager(project)
        manager.build_registry()

        # حل المراجع في نص
        resolved = manager.resolve_references(text, structure)

        # فهارس
        table_index = manager.get_table_index()
        chart_index = manager.get_chart_index()
    """

    def __init__(self, project: Project):
        self.project = project
        self.template = project.template

        # Registry: (str(structure_id), comp_id) → formal reference string
        self._table_registry = {}   # → 'جدول (1-3)'
        self._chart_registry = {}   # → 'شكل (1-1)'

        # For index generation
        self._table_index = []      # [{number, formal, title, item_code, item_name}]
        self._chart_index = []

        # Broken references
        self._broken_refs = []

        self._built = False

    def build_registry(self):
        """
        بناء فهرس الترقيم لكل الجداول والأشكال في المشروع

        يمشي على المحاور بالترتيب → البنود بالترتيب → المكونات بالترتيب
        لكل محور: عدّاد منفصل للجداول والأشكال
        """
        axes = self.template.axes.all().order_by('order')

        for axis in axes:
            table_seq = 0
            chart_seq = 0

            structures = ItemStructure.objects.filter(
                project=self.project,
                item__axis=axis,
            ).select_related('item').order_by('item__order')

            for structure in structures:
                if not structure.components:
                    continue

                for comp in structure.components:
                    comp_type = comp.get('type', '')
                    comp_id = comp.get('id', '')
                    title = comp.get('title', '')
                    key = (str(structure.id), comp_id)

                    if comp_type == 'table':
                        table_seq += 1
                        ref_number = f'{axis.code}-{table_seq}'
                        formal_ref = f'جدول ({ref_number})'

                        self._table_registry[key] = formal_ref
                        self._table_index.append({
                            'number': ref_number,
                            'formal': formal_ref,
                            'title': title,
                            'item_code': structure.item.code,
                            'item_name': structure.item.name,
                        })

                    elif comp_type == 'chart':
                        chart_seq += 1
                        ref_number = f'{axis.code}-{chart_seq}'
                        formal_ref = f'شكل ({ref_number})'

                        self._chart_registry[key] = formal_ref
                        self._chart_index.append({
                            'number': ref_number,
                            'formal': formal_ref,
                            'title': title,
                            'item_code': structure.item.code,
                            'item_name': structure.item.name,
                        })

        self._built = True

    def resolve_references(self, text: str, structure: ItemStructure) -> str:
        """
        استبدال {ref:t1}, {ref:c1}, إلخ في النص بالمراجع الرسمية

        Args:
            text: نص يحتوي على {ref:xx} placeholders
            structure: هيكل البند (لتحديد الـ structure_id)

        Returns:
            النص مع المراجع المحلولة
        """
        if not text or '{ref:' not in text:
            return text

        if not self._built:
            self.build_registry()

        structure_id = str(structure.id)

        def _replace(match):
            ref_id = match.group(1)  # e.g. 't1', 'c1'
            key = (structure_id, ref_id)

            if ref_id.startswith('t'):
                formal = self._table_registry.get(key)
            elif ref_id.startswith('c'):
                formal = self._chart_registry.get(key)
            else:
                formal = None

            if formal:
                return formal

            # Broken reference
            self._broken_refs.append({
                'structure_id': structure_id,
                'item_code': structure.item.code,
                'ref_id': ref_id,
            })
            return f'[مرجع مفقود: {ref_id}]'

        return re.sub(r'\{ref:(\w+)\}', _replace, text)

    def get_table_index(self) -> List[Dict]:
        """فهرس الجداول مرتب"""
        if not self._built:
            self.build_registry()
        return list(self._table_index)

    def get_chart_index(self) -> List[Dict]:
        """فهرس الأشكال مرتب"""
        if not self._built:
            self.build_registry()
        return list(self._chart_index)

    def get_broken_references(self) -> List[Dict]:
        """المراجع المكسورة (جداول/أشكال محذوفة)"""
        return list(self._broken_refs)

    def get_stats(self) -> dict:
        """إحصائيات عامة"""
        if not self._built:
            self.build_registry()
        return {
            'total_tables': len(self._table_index),
            'total_charts': len(self._chart_index),
            'broken_references': len(self._broken_refs),
        }
