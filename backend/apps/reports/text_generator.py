"""
TextGenerator — توليد نصوص AI سياقية لكل فقرة في الهيكل

المبدأ: Context-Aware Paragraph Generation
1. لكل فقرة (paragraph) في ItemStructure:
   - يجمع السياق المحيط (جداول/أشكال قبل وبعد)
   - يجمع بيانات البند من Response
   - يجمع ملخصات الجداول/الأشكال المشار إليها
   - يبني prompt سياقي
   - يستدعي AI engine
   - يحفظ في GeneratedContent

القاعدة الذهبية: الـ AI يكتب النصوص فقط. الجداول والأشكال من البيانات مباشرة.
"""

import logging
from typing import Optional, List, Dict, Any

from django.utils import timezone

from apps.templates_app.models import Axis, Item, TableDefinition, ChartDefinition
from apps.ai_engine.services import generate_with_gemini, generate_with_cli, generate_with_claude
from .models import (
    Project, Response, TableData, ItemStructure,
    GeneratedContent, DetailedResponse,
)

logger = logging.getLogger(__name__)

DEFAULT_AI_MODEL = 'cli'


class TextGenerator:
    """
    توليد نصوص AI لكل فقرة في هيكل المشروع

    Usage:
        generator = TextGenerator(project, model='cli')

        # توليد فقرة واحدة
        result = generator.generate_paragraph(gc)

        # توليد كل الفقرات
        results = generator.generate_all(progress_callback)
    """

    def __init__(self, project: Project, model: str = None):
        self.project = project
        self.template = project.template
        self.model = model or DEFAULT_AI_MODEL
        # Caches — populated by _load_caches()
        self._item_data_cache = {}      # item_id -> dict
        self._responses_cache = {}      # item_id -> [Response]
        self._table_data_cache = {}     # table_def_id -> TableData
        self._detailed_cache = {}       # various keys -> DetailedResponse
        self._caches_loaded = False

    # ==========================================
    # Public API
    # ==========================================

    def generate_paragraph(
        self,
        gc: GeneratedContent,
        extra_instructions: str = '',
        user=None
    ) -> dict:
        """
        توليد نص لفقرة واحدة

        Args:
            gc: سجل GeneratedContent (يجب أن يكون بحالة generating)
            extra_instructions: تعليمات إضافية من المستخدم
            user: المستخدم الذي طلب التوليد

        Returns:
            {success: True, content: str, cost: float, duration_ms: int}
            أو {success: False, error: str}
        """
        if not self._caches_loaded:
            self._load_caches()

        structure = gc.item_structure
        component = structure.get_component(gc.component_id)

        if not component:
            gc.status = 'failed'
            gc.save(update_fields=['status'])
            return {'success': False, 'error': f'المكون {gc.component_id} غير موجود في الهيكل'}

        try:
            # 1. جمع السياق
            context = structure.get_context_for_paragraph(gc.component_id)

            # 2. جمع بيانات البند
            item_data = self._get_item_data(structure.item)

            # 3. بناء الـ prompt
            prompt = self._build_paragraph_prompt(
                gc, structure, component, context, item_data, extra_instructions
            )

            # 4. استدعاء AI
            word_count = self._estimate_word_count(component)
            result = self._call_ai(prompt, word_count)

            if not result.get('success', False):
                gc.status = 'failed'
                gc.save(update_fields=['status'])
                return {
                    'success': False,
                    'error': result.get('error', 'فشل التوليد'),
                }

            # 5. حفظ النتيجة
            content = result.get('content', '').strip()
            ai_metadata = {
                'model': result.get('model', self.model),
                'input_tokens': result.get('input_tokens', 0),
                'output_tokens': result.get('output_tokens', 0),
                'cost': result.get('cost', 0),
                'duration_ms': result.get('duration_ms', 0),
            }

            gc.complete_generation(
                content=content,
                ai_metadata=ai_metadata,
                user=user,
                prompt=prompt,
            )

            return {
                'success': True,
                'content': content,
                'cost': ai_metadata['cost'],
                'duration_ms': ai_metadata['duration_ms'],
                'model': ai_metadata['model'],
            }

        except Exception as e:
            logger.exception(f'خطأ في توليد {gc.component_id} للبند {structure.item.code}')
            gc.status = 'failed'
            gc.save(update_fields=['status'])
            return {'success': False, 'error': str(e)}

    def generate_all(self, progress_callback=None, user=None) -> dict:
        """
        توليد كل الفقرات في المشروع

        Args:
            progress_callback: callback(percentage: int, message: str)
            user: المستخدم

        Returns:
            {
                status: 'completed' | 'partial' | 'failed',
                generated_count: int,
                failed_count: int,
                total_cost: float,
                total_duration_ms: int,
                generated: [{id, component_id, item_code}],
                failed: [{id, component_id, item_code, error}],
            }
        """
        self._load_caches()

        targets = GeneratedContent.objects.filter(
            project=self.project,
            status__in=['not_started', 'generating'],
        ).select_related(
            'item_structure',
            'item_structure__item',
            'item_structure__item__axis',
        ).order_by(
            'item_structure__item__axis__order',
            'item_structure__item__order',
        )

        total = targets.count()
        if total == 0:
            return {
                'status': 'completed',
                'generated_count': 0,
                'failed_count': 0,
                'total_cost': 0,
                'total_duration_ms': 0,
                'generated': [],
                'failed': [],
                'message': 'لا توجد فقرات جاهزة للتوليد',
            }

        results = {
            'generated': [],
            'failed': [],
            'total_cost': 0,
            'total_duration_ms': 0,
        }

        for i, gc in enumerate(targets):
            if progress_callback:
                pct = int((i / total) * 100)
                item_code = gc.item_structure.item.code
                progress_callback(pct, f'توليد {gc.component_id} للبند {item_code}')

            # Mark as generating
            if gc.status != 'generating':
                gc.status = 'generating'
                gc.save(update_fields=['status'])

            result = self.generate_paragraph(gc, user=user)

            if result.get('success'):
                results['generated'].append({
                    'id': str(gc.id),
                    'component_id': gc.component_id,
                    'item_code': gc.item_structure.item.code,
                })
                results['total_cost'] += result.get('cost', 0)
                results['total_duration_ms'] += result.get('duration_ms', 0)
            else:
                results['failed'].append({
                    'id': str(gc.id),
                    'component_id': gc.component_id,
                    'item_code': gc.item_structure.item.code,
                    'error': result.get('error', 'Unknown'),
                })

        if progress_callback:
            progress_callback(100, 'اكتمل التوليد')

        gen_count = len(results['generated'])
        fail_count = len(results['failed'])

        if fail_count == 0:
            status = 'completed'
        elif gen_count == 0:
            status = 'failed'
        else:
            status = 'partial'

        return {
            'status': status,
            'generated_count': gen_count,
            'failed_count': fail_count,
            'total_cost': results['total_cost'],
            'total_duration_ms': results['total_duration_ms'],
            'generated': results['generated'],
            'failed': results['failed'],
            'message': f'تم توليد {gen_count} فقرة من أصل {total}',
        }

    def generate_for_structure(self, structure: ItemStructure, user=None) -> dict:
        """توليد كل الفقرات في هيكل بند واحد"""
        if not self._caches_loaded:
            self._load_caches()

        targets = GeneratedContent.objects.filter(
            item_structure=structure,
            status__in=['not_started', 'generating', 'failed'],
        )

        results = {'generated': [], 'failed': []}

        for gc in targets:
            gc.status = 'generating'
            gc.save(update_fields=['status'])

            result = self.generate_paragraph(gc, user=user)
            if result.get('success'):
                results['generated'].append(str(gc.id))
            else:
                results['failed'].append({'id': str(gc.id), 'error': result.get('error')})

        return results

    # ==========================================
    # Prompt Building
    # ==========================================

    def _build_paragraph_prompt(
        self,
        gc: GeneratedContent,
        structure: ItemStructure,
        component: dict,
        context: dict,
        item_data: dict,
        extra_instructions: str = '',
    ) -> str:
        """بناء prompt سياقي لفقرة واحدة"""
        item = structure.item
        paragraphs = structure.get_paragraphs()
        paragraph_index = next(
            (i for i, p in enumerate(paragraphs) if p['id'] == gc.component_id), 0
        )
        total_paragraphs = len(paragraphs)

        # Style sample
        style_section = ''
        if structure.style_sample:
            sample = structure.style_sample[:500]
            style_section = f'\nاكتب بنفس الأسلوب التالي:\n"{sample}"'

        # Context: before/after
        before_desc = self._describe_components(context.get('before', []), structure)
        after_desc = self._describe_components(context.get('after', []), structure)

        # References: detailed data for referenced tables/charts
        references_desc = self._describe_references(
            context.get('references', []), structure
        )

        # Item data
        data_section = self._format_item_data(item_data)

        # Component info
        comp_title = component.get('title', '')
        comp_desc = component.get('description', '')
        comp_info = comp_title
        if comp_desc:
            comp_info += f'\nوصف: {comp_desc}'

        # Extra instructions
        extra = ''
        if extra_instructions:
            extra = f'\n- تعليمات إضافية: {extra_instructions}'

        prompt = f"""=== الدور ===
أنت كاتب تقارير سنوية مؤسسية محترف باللغة العربية الفصحى.
مهمتك كتابة فقرة واحدة لتقرير سنوي رسمي.{style_section}

=== الموضع ===
البند {item.code} — {item.name}
الفقرة {paragraph_index + 1} من {total_paragraphs}: {comp_info}

=== السياق ===
ما قبل هذه الفقرة: {before_desc or 'بداية البند'}
ما بعد هذه الفقرة: {after_desc or 'نهاية البند'}

=== المراجع (بيانات الجداول والأشكال المرتبطة) ===
{references_desc or 'لا توجد مراجع مباشرة'}

=== البيانات الأساسية ===
{data_section}

=== التعليمات ===
- اكتب فقرة واحدة (3-5 جمل) فقط. لا تكتب أكثر من فقرة.
- استخدم اللغة العربية الفصحى الرسمية
- استخدم صيغة الغائب (حققت الجامعة، بلغ عدد...)
- اذكر الأرقام بين قوسين: (150) عضواً
- إذا تشير لجدول استخدم {{ref:المعرّف}} مثل {{ref:t1}}
- إذا تشير لشكل استخدم {{ref:المعرّف}} مثل {{ref:c1}}
- لا تخترع أرقاماً غير موجودة في البيانات
- لا تكرر عنوان البند
- أعطني النص فقط بدون أي تنسيق markdown أو شرح{extra}
"""
        return prompt

    def _describe_components(self, components: list, structure: ItemStructure) -> str:
        """وصف المكونات المحيطة (قبل/بعد) للـ prompt"""
        if not components:
            return ''
        parts = []
        for comp in components:
            comp_type = comp.get('type', '')
            comp_id = comp.get('id', '')
            title = comp.get('title', '')

            if comp_type == 'paragraph':
                parts.append(f'فقرة ({comp_id}): {title}')
            elif comp_type == 'table':
                summary = self._get_table_data_summary(comp, structure)
                parts.append(f'جدول {{ref:{comp_id}}}: {title}\n{summary}')
            elif comp_type == 'chart':
                summary = self._get_chart_data_summary(comp, structure)
                parts.append(f'شكل {{ref:{comp_id}}}: {title}\n{summary}')
            elif comp_type == 'heading':
                parts.append(f'عنوان فرعي: {title}')

        return '\n'.join(parts)

    def _describe_references(self, ref_ids: list, structure: ItemStructure) -> str:
        """وصف تفصيلي للمراجع المشار إليها"""
        if not ref_ids or not structure.components:
            return ''

        parts = []
        for ref_id in ref_ids:
            comp = structure.get_component(ref_id)
            if not comp:
                continue

            comp_type = comp.get('type', '')
            title = comp.get('title', '')

            if comp_type == 'table':
                summary = self._get_table_data_summary(comp, structure)
                parts.append(f'{{ref:{ref_id}}} — جدول: {title}\n{summary}')
            elif comp_type == 'chart':
                summary = self._get_chart_data_summary(comp, structure)
                parts.append(f'{{ref:{ref_id}}} — شكل: {title}\n{summary}')

        return '\n\n'.join(parts)

    # ==========================================
    # Data Collection
    # ==========================================

    def _get_item_data(self, item: Item) -> dict:
        """جمع بيانات بند — من الكاش أو من DB"""
        if item.id in self._item_data_cache:
            return self._item_data_cache[item.id]

        data = self._collect_item_data(item)
        self._item_data_cache[item.id] = data
        return data

    def _collect_item_data(self, item: Item) -> dict:
        """
        جمع بيانات بند واحد من Response
        (نفس منطق ProjectGenerationService._collect_item_data)
        """
        data = {
            'code': item.code,
            'name': item.name,
            'unit': item.unit or '',
            'field_type': item.field_type,
            'current_value': None,
            'previous_value': None,
            'change_percentage': None,
            'sources': [],
        }

        responses = Response.objects.filter(
            project=self.project,
            item=item,
        ).select_related('contributor', 'contributor__entity')

        values = []
        for resp in responses:
            raw = resp.get_display_value()

            if isinstance(raw, dict):
                current = raw.get('current') or raw.get('value')
                previous = raw.get('previous')
                change = raw.get('change')

                if current is not None:
                    try:
                        values.append(float(current))
                    except (ValueError, TypeError):
                        values.append(current)

                    entity_name = ''
                    if resp.contributor and resp.contributor.entity:
                        entity_name = resp.contributor.entity.name
                    data['sources'].append({
                        'entity': entity_name,
                        'value': current,
                    })

                if previous is not None and data['previous_value'] is None:
                    try:
                        data['previous_value'] = float(previous)
                    except (ValueError, TypeError):
                        data['previous_value'] = previous

                if change is not None and data['change_percentage'] is None:
                    try:
                        data['change_percentage'] = float(str(change).replace('%', ''))
                    except (ValueError, TypeError):
                        pass
            else:
                val = raw
                if val is not None:
                    try:
                        values.append(float(val))
                    except (ValueError, TypeError):
                        values.append(val)

                    entity_name = ''
                    if resp.contributor and resp.contributor.entity:
                        entity_name = resp.contributor.entity.name
                    data['sources'].append({
                        'entity': entity_name,
                        'value': val,
                    })

        # Aggregate values
        numeric_values = [v for v in values if isinstance(v, (int, float))]
        if numeric_values:
            if item.aggregation == 'sum':
                data['current_value'] = sum(numeric_values)
            elif item.aggregation == 'average':
                data['current_value'] = sum(numeric_values) / len(numeric_values)
            elif item.aggregation == 'count':
                data['current_value'] = len(numeric_values)
            elif item.aggregation == 'latest':
                data['current_value'] = numeric_values[-1]
            else:
                data['current_value'] = (
                    numeric_values[0] if len(numeric_values) == 1 else numeric_values
                )
        elif values:
            data['current_value'] = values[0] if len(values) == 1 else values

        # Calculate change percentage if not provided
        if (
            data['current_value'] is not None
            and data['previous_value'] is not None
            and data['change_percentage'] is None
        ):
            try:
                prev = float(data['previous_value'])
                curr = float(data['current_value'])
                if prev != 0:
                    data['change_percentage'] = round(((curr - prev) / prev) * 100, 2)
            except (ValueError, TypeError):
                pass

        return data

    def _format_item_data(self, item_data: dict) -> str:
        """تنسيق بيانات البند للـ prompt"""
        lines = []
        lines.append(f"البند: {item_data['code']} — {item_data['name']}")

        if item_data['current_value'] is not None:
            val_str = f"القيمة الحالية: {item_data['current_value']}"
            if item_data['unit']:
                val_str += f" {item_data['unit']}"
            lines.append(val_str)

            if item_data['previous_value'] is not None:
                prev_str = f"القيمة السابقة: {item_data['previous_value']}"
                if item_data['unit']:
                    prev_str += f" {item_data['unit']}"
                lines.append(prev_str)

            if item_data['change_percentage'] is not None:
                sign = '+' if item_data['change_percentage'] > 0 else ''
                lines.append(f"نسبة التغير: {sign}{item_data['change_percentage']}%")
        else:
            lines.append('لا توجد بيانات رقمية متاحة')

        if item_data['sources']:
            src_strs = []
            for s in item_data['sources'][:5]:  # max 5 sources
                src_strs.append(f"  - {s['entity']}: {s['value']}")
            if src_strs:
                lines.append('المصادر:')
                lines.extend(src_strs)

        return '\n'.join(lines)

    # ==========================================
    # Table/Chart Data Summaries
    # ==========================================

    def _get_table_data_summary(self, comp: dict, structure: ItemStructure) -> str:
        """
        ملخص بيانات جدول للـ prompt
        يبحث عن البيانات بنفس طريقة SkeletonBuilder._render_table()
        """
        table_def_id = comp.get('table_def_id')
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

        # Source 4: TableDefinition columns (no data, just structure)
        if not rows and table_def_id:
            try:
                tdef = TableDefinition.objects.get(id=table_def_id)
                if tdef.columns:
                    headers = [
                        c.get('name', '') for c in tdef.columns if isinstance(c, dict)
                    ]
            except TableDefinition.DoesNotExist:
                pass

        if not headers and not rows:
            return '(لا توجد بيانات للجدول)'

        # Build summary
        summary_parts = []
        if headers:
            summary_parts.append(f"الأعمدة: {', '.join(str(h) for h in headers)}")
        summary_parts.append(f"عدد الصفوف: {len(rows)}")

        # Show first few rows as sample
        if rows:
            sample_count = min(3, len(rows))
            sample_lines = []
            for row in rows[:sample_count]:
                if isinstance(row, list):
                    sample_lines.append(' | '.join(str(cell) for cell in row))
                elif isinstance(row, dict):
                    sample_lines.append(' | '.join(str(v) for v in row.values()))
            if sample_lines:
                summary_parts.append(f"عينة ({sample_count} صفوف أولى):")
                for line in sample_lines:
                    summary_parts.append(f"  {line}")

            # Try to find numeric totals
            if headers and rows:
                try:
                    numeric_cols = []
                    for col_idx, h in enumerate(headers):
                        vals = []
                        for row in rows:
                            cell = row[col_idx] if isinstance(row, list) else row.get(h, '')
                            try:
                                vals.append(float(cell))
                            except (ValueError, TypeError):
                                pass
                        if vals:
                            numeric_cols.append((h, sum(vals), max(vals)))

                    if numeric_cols:
                        totals = []
                        for h, total, mx in numeric_cols[:3]:
                            totals.append(f"{h}: مجموع={total}")
                        summary_parts.append(f"إحصائيات: {', '.join(totals)}")
                except (IndexError, TypeError):
                    pass

        return '\n'.join(summary_parts)

    def _get_chart_data_summary(self, comp: dict, structure: ItemStructure) -> str:
        """ملخص بيانات شكل بياني للـ prompt"""
        chart_def_id = comp.get('chart_def_id')
        chart_type = comp.get('config', {}).get('chart_type', 'bar')
        labels = []
        values = []

        # From DetailedResponse
        item_id = structure.item_id
        data_source = comp.get('data_source', '')
        dr = self._detailed_cache.get((item_id, data_source))
        if dr and dr.data:
            labels = dr.data.get('labels', dr.data.get('headers', []))
            values = dr.data.get('values', [])

        # From ChartDefinition + TableData
        if not values and chart_def_id:
            try:
                chart_def = ChartDefinition.objects.get(id=chart_def_id)
                chart_type = chart_def.chart_type
                ds = chart_def.data_source
                if ds and ds.get('type') == 'table':
                    table_code = ds.get('table_code')
                    for key, td in self._table_data_cache.items():
                        if td.table_definition.code == table_code:
                            if td.rows:
                                label_col = ds.get('label_column', 0)
                                value_col = ds.get('value_column', 1)
                                for row in td.rows:
                                    cols = (
                                        list(row.values())
                                        if isinstance(row, dict) else row
                                    )
                                    if len(cols) > max(label_col, value_col):
                                        labels.append(str(cols[label_col]))
                                        try:
                                            values.append(float(cols[value_col]))
                                        except (ValueError, TypeError):
                                            values.append(0)
                            break
            except ChartDefinition.DoesNotExist:
                pass

        if not labels and not values:
            return '(لا توجد بيانات للشكل)'

        summary_parts = [f"النوع: {chart_type}"]

        if labels and values:
            total = sum(values) if values else 1
            data_items = []
            for label, val in list(zip(labels, values))[:5]:
                pct = round(val / total * 100, 1) if total else 0
                data_items.append(f"{label}: {val} ({pct}%)")
            summary_parts.append(f"البيانات: {', '.join(data_items)}")

            if len(labels) > 5:
                summary_parts.append(f"... و{len(labels) - 5} عنصر آخر")

        return '\n'.join(summary_parts)

    # ==========================================
    # Helpers
    # ==========================================

    def _load_caches(self):
        """تحميل كل البيانات مرة واحدة"""
        # Table data
        for td in TableData.objects.filter(
            project=self.project
        ).select_related('table_definition'):
            self._table_data_cache[td.table_definition_id] = td

        # Detailed responses
        for dr in DetailedResponse.objects.filter(
            project=self.project
        ).select_related('item'):
            key = (dr.item_id, dr.data_source)
            self._detailed_cache[key] = dr
            if dr.table_definition_id:
                self._detailed_cache[('table_def', dr.table_definition_id)] = dr

        self._caches_loaded = True

    def _call_ai(self, prompt: str, word_count: int = 200) -> dict:
        """استدعاء AI engine"""
        if self.model == 'gemini':
            return generate_with_gemini(prompt, word_count=word_count)
        elif self.model == 'claude':
            return generate_with_claude(prompt, word_count=word_count)
        else:  # cli (default)
            return generate_with_cli(prompt, word_count=word_count)

    def _estimate_word_count(self, component: dict) -> int:
        """تقدير عدد الكلمات المطلوب حسب المكون"""
        # Short paragraphs: 3-5 sentences ≈ 100-200 words in Arabic
        return 200
