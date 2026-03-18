"""
SkeletonBuilder — بناء الهيكل HTML كاملاً بدون AI

المبدأ: Skeleton-First
1. يقرأ ItemStructure (الهيكل) لكل بند
2. يبني الجداول من البيانات الحقيقية (Response, TableData, DetailedResponse)
3. يبني الأشكال البيانية من البيانات
4. يترك placeholders للفقرات النصية (يملؤها AI لاحقاً)
5. يُرجع HTML كامل جاهز

القاعدة الذهبية: الـ AI يكتب النصوص فقط. الجداول والأشكال من البيانات مباشرة.
"""

import json
from typing import Optional, List, Dict, Any

from apps.templates_app.models import Axis, Item, TableDefinition, ChartDefinition
from apps.reports.models import (
    Project, Response, TableData, ItemStructure,
    GeneratedContent, DetailedResponse,
)


class SkeletonBuilder:
    """
    يبني HTML Skeleton كامل لمشروع

    Usage:
        builder = SkeletonBuilder(project)
        html = builder.build_full_report()
        # أو لبند واحد:
        html = builder.build_item_skeleton(item_structure)
    """

    def __init__(self, project: Project):
        self.project = project
        self.template = project.template
        # Cache for data
        self._responses_cache = {}
        self._table_data_cache = {}
        self._detailed_cache = {}
        self._generated_content_cache = {}

    def _load_caches(self):
        """تحميل كل البيانات مرة واحدة"""
        # Responses
        for resp in Response.objects.filter(project=self.project).select_related('item'):
            self._responses_cache[resp.item_id] = resp

        # Table data
        for td in TableData.objects.filter(project=self.project).select_related('table_definition'):
            self._table_data_cache[td.table_definition_id] = td

        # Detailed responses
        for dr in DetailedResponse.objects.filter(project=self.project).select_related('item'):
            key = (dr.item_id, dr.data_source)
            self._detailed_cache[key] = dr
            # Also store by table_definition_id if linked
            if dr.table_definition_id:
                self._detailed_cache[('table_def', dr.table_definition_id)] = dr

        # Generated contents
        for gc in GeneratedContent.objects.filter(project=self.project).select_related('item_structure'):
            key = (gc.item_structure_id, gc.component_id)
            self._generated_content_cache[key] = gc

    def build_full_report(self, progress_callback=None) -> str:
        """
        بناء تقرير HTML كامل

        Returns: HTML string
        """
        self._load_caches()

        org_name = self.project.organization.name if self.project.organization else ''

        html_parts = []
        html_parts.append(self._build_report_header(org_name))

        axes = self.template.axes.all().prefetch_related('items').order_by('order')
        total_axes = axes.count()

        for i, axis in enumerate(axes):
            if progress_callback:
                progress = 10 + int((i / total_axes) * 70)
                progress_callback(progress, f'بناء هيكل: {axis.name}')

            html_parts.append(self._build_axis_section(axis))

        html_parts.append(self._build_report_footer())

        return '\n'.join(html_parts)

    def build_item_skeleton(self, structure: ItemStructure) -> str:
        """
        بناء HTML skeleton لبند واحد

        Args:
            structure: هيكل البند
        Returns: HTML string للبند
        """
        if not self._responses_cache:
            self._load_caches()

        return self._render_item_from_structure(structure)

    # ==========================================
    # Private: Report structure
    # ==========================================

    def _build_report_header(self, org_name: str) -> str:
        return f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>{self.project.name}</title>
    <style>
        {self._get_report_css()}
    </style>
</head>
<body>
    <header class="report-header">
        <h1>{self.project.name}</h1>
        <p class="org-name">{org_name}</p>
        <p class="period">{self.project.period}</p>
    </header>
    <main class="report-content">
'''

    def _build_report_footer(self) -> str:
        return '''
    </main>
</body>
</html>'''

    def _build_axis_section(self, axis: Axis) -> str:
        """بناء قسم المحور"""
        html = f'''
    <section class="axis" id="axis-{axis.code}">
        <h2 class="axis-title">المحور {axis.code}: {axis.name}</h2>
'''
        items = axis.items.all().order_by('order')
        for item in items:
            # Get structure for this item
            structure = ItemStructure.objects.filter(
                project=self.project, item=item
            ).first()

            if structure:
                html += self._render_item_from_structure(structure)
            else:
                # Fallback: basic item with no structure
                html += self._render_item_basic(item)

        html += '    </section>\n'
        return html

    # ==========================================
    # Private: Item rendering
    # ==========================================

    def _render_item_from_structure(self, structure: ItemStructure) -> str:
        """رسم بند من الهيكل المعرّف"""
        item = structure.item
        html = f'''
        <article class="item" id="item-{item.code}">
            <h3 class="item-title">{item.code}: {item.name}</h3>
'''
        if not structure.components:
            html += '            <div class="placeholder">لا يوجد هيكل محدد</div>\n'
            html += '        </article>\n'
            return html

        for comp in structure.components:
            comp_type = comp.get('type', '')
            comp_id = comp.get('id', '')

            if comp_type == 'paragraph':
                html += self._render_paragraph(structure, comp)
            elif comp_type == 'table':
                html += self._render_table(structure, comp)
            elif comp_type == 'chart':
                html += self._render_chart(structure, comp)
            elif comp_type == 'heading':
                title = comp.get('title', '')
                html += f'            <h4 class="sub-heading">{title}</h4>\n'

        html += '        </article>\n'
        return html

    def _render_item_basic(self, item: Item) -> str:
        """رسم بند بدون هيكل (fallback)"""
        html = f'''
        <article class="item" id="item-{item.code}">
            <h3 class="item-title">{item.code}: {item.name}</h3>
'''
        # Get response value
        response = self._responses_cache.get(item.id)
        if response:
            val = response.get_simple_value()
            if val is not None:
                html += f'            <p class="item-value">القيمة: {val} {item.unit}</p>\n'

        html += '            <div class="placeholder ai-placeholder" data-component="p1">فقرة تحليلية (في انتظار التوليد)</div>\n'
        html += '        </article>\n'
        return html

    # ==========================================
    # Private: Component rendering
    # ==========================================

    def _render_paragraph(self, structure: ItemStructure, comp: dict) -> str:
        """رسم فقرة نصية — من AI أو placeholder"""
        comp_id = comp.get('id', 'p1')
        title = comp.get('title', '')

        # Check if generated content exists
        gc = self._generated_content_cache.get((structure.id, comp_id))

        if gc and gc.final_content:
            # لدينا محتوى مولّد
            content = gc.final_content
            status_class = f'status-{gc.status}'
            return f'''            <div class="paragraph {status_class}" data-component="{comp_id}" data-structure="{structure.id}">
                {self._text_to_html(content)}
            </div>
'''
        else:
            # Placeholder — ينتظر التوليد
            return f'''            <div class="paragraph placeholder ai-placeholder" data-component="{comp_id}" data-structure="{structure.id}">
                <span class="placeholder-label">{title or f'فقرة {comp_id}'}</span>
                <span class="placeholder-status">في انتظار التوليد</span>
            </div>
'''

    def _render_table(self, structure: ItemStructure, comp: dict) -> str:
        """رسم جدول من البيانات الحقيقية"""
        comp_id = comp.get('id', 't1')
        title = comp.get('title', f'جدول {comp_id}')
        table_def_id = comp.get('table_def_id')

        # Try to find table data from multiple sources
        table_html = ''
        headers = []
        rows = []

        # Source 1: DetailedResponse linked to table_definition
        if table_def_id:
            dr = self._detailed_cache.get(('table_def', table_def_id))
            if dr and dr.data:
                headers = dr.data.get('headers', [])
                rows = dr.data.get('rows', [])

        # Source 2: TableData linked to table_definition
        if not rows and table_def_id:
            td = self._table_data_cache.get(table_def_id)
            if td and td.rows:
                # TableData.rows is list of dicts
                if td.rows and isinstance(td.rows[0], dict):
                    headers = list(td.rows[0].keys())
                    rows = [[r.get(h, '') for h in headers] for r in td.rows]

        # Source 3: DetailedResponse linked to item
        if not rows:
            item_id = structure.item_id
            data_source = comp.get('data_source', '')
            dr = self._detailed_cache.get((item_id, data_source))
            if dr and dr.data:
                headers = dr.data.get('headers', [])
                rows = dr.data.get('rows', [])

        # Source 4: TableDefinition with fixed_rows (static tables)
        if not rows and table_def_id:
            try:
                tdef = TableDefinition.objects.get(id=table_def_id)
                if tdef.columns:
                    headers = [c.get('name', '') for c in tdef.columns if isinstance(c, dict)]
                if tdef.fixed_rows:
                    # Create empty rows from fixed rows
                    rows = [[fr] + [''] * (len(headers) - 1) for fr in tdef.fixed_rows]
            except TableDefinition.DoesNotExist:
                pass

        if headers and rows:
            # Build real table
            table_html = f'''            <div class="table-container" data-component="{comp_id}">
                <p class="table-title">{title}</p>
                <table class="data-table">
                    <thead>
                        <tr>{''.join(f'<th>{h}</th>' for h in headers)}</tr>
                    </thead>
                    <tbody>
'''
            for row in rows:
                cells = ''.join(f'<td>{cell}</td>' for cell in row)
                table_html += f'                        <tr>{cells}</tr>\n'

            table_html += '''                    </tbody>
                </table>
            </div>
'''
        else:
            # Empty table placeholder
            table_html = f'''            <div class="table-container placeholder table-placeholder" data-component="{comp_id}">
                <p class="table-title">{title}</p>
                <p class="placeholder-status">في انتظار البيانات</p>
            </div>
'''
        return table_html

    def _render_chart(self, structure: ItemStructure, comp: dict) -> str:
        """رسم شكل بياني"""
        comp_id = comp.get('id', 'c1')
        title = comp.get('title', f'شكل {comp_id}')
        chart_def_id = comp.get('chart_def_id')
        chart_type = comp.get('config', {}).get('chart_type', 'bar')

        # Try to get data for the chart
        labels = []
        values = []

        # From DetailedResponse
        item_id = structure.item_id
        data_source = comp.get('data_source', '')
        dr = self._detailed_cache.get((item_id, data_source))
        if dr and dr.data:
            labels = dr.data.get('labels', dr.data.get('headers', []))
            values = dr.data.get('values', [])

        # From ChartDefinition data_source
        if not values and chart_def_id:
            try:
                chart_def = ChartDefinition.objects.get(id=chart_def_id)
                chart_type = chart_def.chart_type
                # Try to resolve data from chart_def.data_source
                ds = chart_def.data_source
                if ds and ds.get('type') == 'table':
                    table_code = ds.get('table_code')
                    # Find table data
                    for key, td in self._table_data_cache.items():
                        if td.table_definition.code == table_code:
                            if td.rows:
                                label_col = ds.get('label_column', 0)
                                value_col = ds.get('value_column', 1)
                                for row in td.rows:
                                    if isinstance(row, dict):
                                        cols = list(row.values())
                                    else:
                                        cols = row
                                    if len(cols) > max(label_col, value_col):
                                        labels.append(str(cols[label_col]))
                                        try:
                                            values.append(float(cols[value_col]))
                                        except (ValueError, TypeError):
                                            values.append(0)
                            break
            except ChartDefinition.DoesNotExist:
                pass

        if labels and values:
            # Build CSS-only chart
            return self._build_css_chart(comp_id, title, chart_type, labels, values)
        else:
            # Chart placeholder
            return f'''            <div class="chart-container placeholder chart-placeholder" data-component="{comp_id}">
                <p class="chart-title">{title}</p>
                <p class="placeholder-status">في انتظار البيانات</p>
            </div>
'''

    # ==========================================
    # Private: Helpers
    # ==========================================

    def _text_to_html(self, text: str) -> str:
        """تحويل نص إلى HTML مع الحفاظ على الفقرات"""
        if not text:
            return ''
        paragraphs = text.strip().split('\n\n')
        html_parts = []
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            # Single newlines → <br>
            p = p.replace('\n', '<br>')
            html_parts.append(f'<p>{p}</p>')
        return '\n                '.join(html_parts)

    def _build_css_chart(self, comp_id: str, title: str, chart_type: str,
                         labels: list, values: list) -> str:
        """بناء رسم بياني بـ CSS فقط (بدون JavaScript)"""
        max_val = max(values) if values else 1
        if max_val == 0:
            max_val = 1

        colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
                  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b']

        html = f'''            <div class="chart-container" data-component="{comp_id}">
                <p class="chart-title">{title}</p>
'''
        if chart_type in ('bar', 'stacked_bar'):
            html += '                <div class="bar-chart">\n'
            for i, (label, val) in enumerate(zip(labels, values)):
                width = int((val / max_val) * 100)
                color = colors[i % len(colors)]
                html += f'''                    <div class="bar-row">
                        <span class="bar-label">{label}</span>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: {width}%; background: {color};"></div>
                        </div>
                        <span class="bar-value">{val}</span>
                    </div>
'''
            html += '                </div>\n'

        elif chart_type in ('pie', 'donut'):
            total = sum(values) if values else 1
            html += '                <div class="pie-chart-legend">\n'
            for i, (label, val) in enumerate(zip(labels, values)):
                pct = round(val / total * 100, 1)
                color = colors[i % len(colors)]
                html += f'''                    <div class="legend-item">
                        <span class="legend-color" style="background: {color};"></span>
                        <span class="legend-label">{label}</span>
                        <span class="legend-value">{val} ({pct}%)</span>
                    </div>
'''
            html += '                </div>\n'

        else:
            # Line/area → fallback to bar
            html += '                <div class="bar-chart">\n'
            for i, (label, val) in enumerate(zip(labels, values)):
                width = int((val / max_val) * 100)
                color = colors[i % len(colors)]
                html += f'                    <div class="bar-row"><span class="bar-label">{label}</span><div class="bar-track"><div class="bar-fill" style="width:{width}%;background:{color};"></div></div><span class="bar-value">{val}</span></div>\n'
            html += '                </div>\n'

        html += '            </div>\n'
        return html

    def _get_report_css(self) -> str:
        """CSS الأساسي للتقرير"""
        return '''
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', 'Tahoma', sans-serif; direction: rtl; text-align: right;
               line-height: 1.8; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; }
        .report-header { text-align: center; padding: 40px 20px; border-bottom: 3px solid #2c3e50;
                         margin-bottom: 30px; }
        .report-header h1 { font-size: 28px; color: #2c3e50; margin-bottom: 10px; }
        .org-name { font-size: 18px; color: #666; }
        .period { font-size: 16px; color: #888; }

        .axis { margin-bottom: 40px; page-break-before: always; }
        .axis:first-child { page-break-before: avoid; }
        .axis-title { font-size: 22px; color: #2c3e50; border-bottom: 2px solid #3498db;
                      padding-bottom: 10px; margin-bottom: 20px; }

        .item { margin-bottom: 30px; padding: 15px; background: #fafafa; border-radius: 8px; }
        .item-title { font-size: 18px; color: #34495e; margin-bottom: 15px;
                      border-right: 4px solid #3498db; padding-right: 12px; }

        .paragraph { margin-bottom: 15px; }
        .paragraph p { margin-bottom: 10px; text-align: justify; }

        .placeholder { background: #fff3cd; border: 2px dashed #ffc107; padding: 20px;
                       border-radius: 8px; text-align: center; margin: 15px 0; }
        .ai-placeholder { background: #e8f4fd; border-color: #3498db; }
        .table-placeholder { background: #fff8e1; border-color: #ff9800; }
        .chart-placeholder { background: #f3e5f5; border-color: #9c27b0; }
        .placeholder-label { display: block; font-weight: bold; color: #555; }
        .placeholder-status { display: block; font-size: 14px; color: #888; margin-top: 5px; }

        .status-generated { border-right: 3px solid #3498db; padding-right: 10px; }
        .status-edited { border-right: 3px solid #9b59b6; padding-right: 10px; }
        .status-approved { border-right: 3px solid #27ae60; padding-right: 10px; }

        .table-container { margin: 20px 0; }
        .table-title { font-weight: bold; color: #2c3e50; margin-bottom: 8px; text-align: center; }
        .data-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .data-table th { background: #2c3e50; color: white; padding: 10px 8px; font-size: 14px; }
        .data-table td { padding: 8px; border: 1px solid #ddd; font-size: 14px; }
        .data-table tr:nth-child(even) { background: #f8f9fa; }
        .data-table tr:hover { background: #e9ecef; }

        .chart-container { margin: 20px 0; }
        .chart-title { font-weight: bold; color: #2c3e50; margin-bottom: 10px; text-align: center; }
        .bar-chart { padding: 10px; }
        .bar-row { display: flex; align-items: center; margin-bottom: 8px; gap: 8px; }
        .bar-label { min-width: 120px; font-size: 13px; text-align: right; }
        .bar-track { flex: 1; background: #ecf0f1; border-radius: 4px; height: 24px; }
        .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; min-width: 2px; }
        .bar-value { min-width: 50px; font-size: 13px; font-weight: bold; }
        .pie-chart-legend { padding: 10px; }
        .legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .legend-color { width: 16px; height: 16px; border-radius: 3px; display: inline-block; }
        .legend-label { flex: 1; font-size: 14px; }
        .legend-value { font-weight: bold; font-size: 14px; }

        .sub-heading { font-size: 16px; color: #555; margin: 15px 0 10px; }
        .item-value { font-size: 16px; color: #2c3e50; font-weight: bold; margin-bottom: 10px; }

        @media print {
            body { max-width: 100%; padding: 0; }
            .placeholder { border-style: solid; }
        }
        '''
