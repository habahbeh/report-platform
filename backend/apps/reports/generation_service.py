"""
Report Generation Service
خدمة توليد التقارير — تجمع البيانات وترسلها للـ AI

الخيارات:
- توليد محور واحد
- توليد عدة محاور
- توليد الكل
- إعادة توليد محور معين
"""

import hashlib
import json
from decimal import Decimal
from typing import List, Dict, Optional, Any
from django.db import transaction
from django.utils import timezone

from apps.templates_app.models import Axis, Item
from apps.data_collection.models import DataCollectionPeriod, EntitySubmission, DataFile
from apps.ai_engine.services import generate_with_gemini, generate_with_cli
from .models import AxisDraft, ItemDraft

# Default model
DEFAULT_AI_MODEL = 'cli'  # Claude CLI (uses Pro subscription)


class GenerationService:
    """خدمة توليد محتوى التقارير"""
    
    def __init__(self, period: DataCollectionPeriod, model: str = None):
        self.period = period
        self.template = period.template
        self.model = model or DEFAULT_AI_MODEL  # 'cli' by default
    
    def generate_axes(
        self,
        axis_ids: Optional[List[int]] = None,
        regenerate: bool = False,
        user=None
    ) -> Dict[str, Any]:
        """
        توليد محاور معينة أو الكل
        
        Args:
            axis_ids: قائمة IDs المحاور (None = الكل)
            regenerate: إعادة التوليد حتى لو موجود
            user: المستخدم الذي طلب التوليد
        
        Returns:
            {
                'status': 'completed' | 'partial' | 'failed',
                'drafts': [AxisDraft, ...],
                'errors': [{'axis_id': ..., 'error': ...}, ...]
            }
        """
        # تحديد المحاور
        if axis_ids:
            axes = self.template.axes.filter(id__in=axis_ids).order_by('order')
        else:
            axes = self.template.axes.all().order_by('order')
        
        if not axes.exists():
            return {
                'status': 'failed',
                'message': 'لا توجد محاور للتوليد',
                'drafts': [],
                'errors': []
            }
        
        results = {
            'status': 'completed',
            'message': '',
            'drafts': [],
            'errors': []
        }
        
        for axis in axes:
            try:
                draft = self._generate_single_axis(axis, regenerate, user)
                results['drafts'].append(draft)
            except Exception as e:
                results['errors'].append({
                    'axis_id': axis.id,
                    'axis_name': axis.name,
                    'error': str(e)
                })
        
        # تحديد الحالة النهائية
        if results['errors'] and not results['drafts']:
            results['status'] = 'failed'
            results['message'] = 'فشل توليد جميع المحاور'
        elif results['errors']:
            results['status'] = 'partial'
            results['message'] = f"تم توليد {len(results['drafts'])} من {len(axes)} محاور"
        else:
            results['message'] = f"تم توليد {len(results['drafts'])} محاور بنجاح"
        
        return results
    
    def _generate_single_axis(
        self,
        axis: Axis,
        regenerate: bool = False,
        user=None
    ) -> AxisDraft:
        """توليد محور واحد"""
        
        # الحصول على أو إنشاء المسودة
        draft, created = AxisDraft.objects.get_or_create(
            period=self.period,
            axis=axis,
            defaults={'status': 'not_started'}
        )
        
        # التحقق: هل نحتاج إعادة توليد؟
        if not regenerate and draft.status in ['generated', 'edited', 'approved']:
            if not draft.is_data_changed:
                return draft  # لا تغيير في البيانات، إرجاع الموجود
        
        # بدء التوليد
        draft.start_generation(user)
        
        try:
            # 1. جمع البيانات
            axis_data = self._collect_axis_data(axis)
            draft.source_data = axis_data
            
            # 2. بناء الـ prompt
            prompt = self._build_prompt(axis, axis_data)
            
            # 3. استدعاء AI
            if self.model == 'gemini':
                result = generate_with_gemini(prompt, word_count=800)
            elif self.model == 'cli':
                result = generate_with_cli(prompt, word_count=800)
            else:
                # Default to gemini
                result = generate_with_gemini(prompt, word_count=800)
            
            if not result.get('success', False):
                raise Exception(result.get('error', 'فشل التوليد'))
            
            # 4. حفظ النتيجة
            ai_metadata = {
                'model': result.get('model', self.model),
                'input_tokens': result.get('input_tokens', 0),
                'output_tokens': result.get('output_tokens', 0),
                'cost': result.get('cost', 0),
                'duration_ms': result.get('duration_ms', 0),
            }
            
            draft.complete_generation(
                content=result.get('content', ''),
                ai_metadata=ai_metadata,
                user=user
            )
            
            return draft
            
        except Exception as e:
            # فشل التوليد
            draft.status = 'not_started'
            draft.save(update_fields=['status'])
            raise e
    
    def _collect_axis_data(self, axis: Axis) -> Dict[str, Any]:
        """
        جمع بيانات المحور من:
        - EntitySubmission
        - DataFile
        - بيانات السنة السابقة
        """
        data = {
            'axis': {
                'code': axis.code,
                'name': axis.name,
                'description': axis.description,
            },
            'period': {
                'name': self.period.name,
                'academic_year': self.period.academic_year,
            },
            'items': [],
            'tables': [],
            'previous_year': {},
        }
        
        # جمع بيانات البنود
        for item in axis.items.all().order_by('order'):
            item_data = {
                'code': item.code,
                'name': item.name,
                'unit': item.unit,
                'field_type': item.field_type,
                'current_value': None,
                'previous_value': None,
                'change_percentage': None,
                'sources': [],  # الجهات التي أدخلت البيانات
            }
            
            # جمع من DataFile
            files = DataFile.objects.filter(
                item=item,
                submission__period=self.period,
                status='approved',
                is_current=True
            ).select_related('entity', 'submission')
            
            values = []
            for f in files:
                if f.parsed_data:
                    value = f.parsed_data.get('value')
                    if value is not None:
                        values.append(value)
                        item_data['sources'].append({
                            'entity': f.entity.name if f.entity else 'غير محدد',
                            'value': value
                        })
            
            # تجميع القيم حسب نوع التجميع
            if values:
                if item.aggregation == 'sum':
                    item_data['current_value'] = sum(values)
                elif item.aggregation == 'average':
                    item_data['current_value'] = sum(values) / len(values)
                elif item.aggregation == 'count':
                    item_data['current_value'] = len(values)
                elif item.aggregation == 'latest':
                    item_data['current_value'] = values[-1]
                else:
                    # none أو غير محدد — أخذ أول قيمة
                    item_data['current_value'] = values[0] if len(values) == 1 else values
            
            # TODO: جلب بيانات السنة السابقة
            # item_data['previous_value'] = ...
            
            # حساب نسبة التغير
            if item_data['current_value'] and item_data['previous_value']:
                try:
                    prev = float(item_data['previous_value'])
                    curr = float(item_data['current_value'])
                    if prev != 0:
                        item_data['change_percentage'] = round(((curr - prev) / prev) * 100, 2)
                except (ValueError, TypeError):
                    pass
            
            data['items'].append(item_data)
        
        return data
    
    def _build_prompt(self, axis: Axis, data: Dict[str, Any]) -> str:
        """بناء prompt للـ AI"""
        
        # استخدام prompt المحور إن وجد
        base_prompt = axis.ai_prompt or self._default_axis_prompt()
        
        # بناء جدول البيانات
        items_text = self._format_items_for_prompt(data['items'])
        
        prompt = f"""
{base_prompt}

=== معلومات المحور ===
المحور: {data['axis']['name']}
الفترة: {data['period']['academic_year']}

=== بيانات المؤشرات ===
{items_text}

=== المطلوب ===
اكتب تحليلاً شاملاً لهذا المحور يتضمن:
1. مقدمة موجزة عن المحور
2. تحليل كل مؤشر مع ذكر القيمة ونسبة التغير إن وجدت
3. إبراز الإنجازات والتحسينات
4. ذكر التحديات إن وجدت
5. خاتمة موجزة

اكتب بأسلوب رسمي أكاديمي مناسب للتقارير الجامعية.
لا تخترع أرقاماً غير موجودة في البيانات.
"""
        
        return prompt
    
    def _default_axis_prompt(self) -> str:
        """Prompt افتراضي للمحاور"""
        return """أنت كاتب تقارير مؤسسية محترف باللغة العربية الفصحى.
مهمتك كتابة تحليل لمحور من محاور التقرير السنوي بناءً على البيانات المقدمة.

قواعد الكتابة:
- استخدم اللغة العربية الفصحى الرسمية
- كن دقيقاً في ذكر الأرقام
- استخدم صيغة الغائب (حققت الجامعة، بلغ عدد...)
- اربط البيانات بالسياق المؤسسي
- اجعل النص متماسكاً ومترابطاً"""
    
    def _format_items_for_prompt(self, items: List[Dict]) -> str:
        """تنسيق البنود للـ prompt"""
        lines = []
        for item in items:
            line = f"• {item['code']} - {item['name']}"
            
            if item['current_value'] is not None:
                line += f": {item['current_value']}"
                if item['unit']:
                    line += f" {item['unit']}"
            
            if item['previous_value'] is not None:
                line += f" (السنة السابقة: {item['previous_value']}"
                if item['change_percentage'] is not None:
                    sign = '+' if item['change_percentage'] > 0 else ''
                    line += f"، التغير: {sign}{item['change_percentage']}%"
                line += ")"
            
            if item['current_value'] is None:
                line += ": لا توجد بيانات"
            
            lines.append(line)
        
        return '\n'.join(lines) if lines else 'لا توجد بيانات متاحة'


    # ==========================================
    # توليد على مستوى البند (Item)
    # ==========================================
    
    def generate_items(
        self,
        item_ids: Optional[List[int]] = None,
        axis_id: Optional[int] = None,
        regenerate: bool = False,
        user=None
    ) -> Dict[str, Any]:
        """
        توليد بنود معينة أو كل بنود محور أو الكل
        
        Args:
            item_ids: قائمة IDs البنود (None = حسب axis_id أو الكل)
            axis_id: ID المحور (لتوليد كل بنوده)
            regenerate: إعادة التوليد حتى لو موجود
            user: المستخدم
        """
        # تحديد البنود
        if item_ids:
            items = Item.objects.filter(id__in=item_ids, axis__template=self.template)
        elif axis_id:
            items = Item.objects.filter(axis_id=axis_id, axis__template=self.template)
        else:
            items = Item.objects.filter(axis__template=self.template)
        
        items = items.order_by('axis__order', 'order')
        
        if not items.exists():
            return {
                'status': 'failed',
                'message': 'لا توجد بنود للتوليد',
                'drafts': [],
                'errors': []
            }
        
        results = {
            'status': 'completed',
            'message': '',
            'drafts': [],
            'errors': []
        }
        
        for item in items:
            try:
                draft = self._generate_single_item(item, regenerate, user)
                results['drafts'].append(draft)
            except Exception as e:
                results['errors'].append({
                    'item_id': item.id,
                    'item_code': item.code,
                    'item_name': item.name,
                    'error': str(e)
                })
        
        # تحديد الحالة النهائية
        if results['errors'] and not results['drafts']:
            results['status'] = 'failed'
            results['message'] = 'فشل توليد جميع البنود'
        elif results['errors']:
            results['status'] = 'partial'
            results['message'] = f"تم توليد {len(results['drafts'])} من {items.count()} بند"
        else:
            results['message'] = f"تم توليد {len(results['drafts'])} بند بنجاح"
        
        return results
    
    def _generate_single_item(
        self,
        item: Item,
        regenerate: bool = False,
        user=None
    ) -> ItemDraft:
        """توليد بند واحد مع دعم قالب المخرجات"""
        
        # الحصول على أو إنشاء المسودة
        draft, created = ItemDraft.objects.get_or_create(
            period=self.period,
            item=item,
            defaults={'status': 'not_started'}
        )
        
        # التحقق: هل نحتاج إعادة توليد؟
        if not regenerate and draft.status in ['generated', 'edited', 'approved']:
            return draft
        
        # بدء التوليد
        draft.status = 'generating'
        draft.save(update_fields=['status'])
        
        try:
            # 1. جمع بيانات البند
            item_data = self._collect_item_data(item)
            
            # حفظ القيم في المسودة (فقط إذا جاءت قيمة جديدة)
            if item_data.get('current_value') is not None:
                draft.current_value = item_data.get('current_value')
            # استخدام القيمة الموجودة في الـ draft إذا لم تأت من DataFile
            if draft.current_value is not None:
                item_data['current_value'] = draft.current_value
            
            if item_data.get('previous_value') is not None:
                draft.previous_value = item_data.get('previous_value')
            if draft.previous_value is not None:
                item_data['previous_value'] = draft.previous_value
                
            if item_data.get('change_percentage') is not None:
                draft.change_percentage = Decimal(str(item_data['change_percentage']))
            
            # 2. الحصول على قالب المخرجات
            output_template = draft.output_template
            if not output_template:
                # استخدام القالب الافتراضي
                from .models import OutputTemplate
                output_template = OutputTemplate.objects.filter(is_default=True).first()
            
            # 3. تحديد المكونات المطلوبة
            components = []
            if output_template:
                components = list(output_template.components.all().order_by('order'))
            
            # إذا لا يوجد قالب، استخدم نص فقط
            if not components:
                components = [{'type': 'text', 'source': 'auto'}]
            else:
                components = [{'type': c.type, 'source': c.source, 'title': c.title} for c in components]
            
            # 4. بناء prompt حسب المكونات
            prompt = self._build_item_prompt_with_components(item, item_data, components)
            
            # 5. استدعاء AI
            if self.model == 'gemini':
                result = generate_with_gemini(prompt, word_count=400)
            else:  # cli or claude
                result = generate_with_cli(prompt, word_count=400)
            
            if not result.get('success', False):
                raise Exception(result.get('error', 'فشل التوليد'))
            
            # 6. تحليل النتيجة وفصل المكونات
            content = result.get('content', '')
            table_data, chart_config = self._parse_generated_content(content, item_data, components)
            
            # 7. حفظ النتيجة
            ai_metadata = {
                'model': result.get('model', self.model),
                'input_tokens': result.get('input_tokens', 0),
                'output_tokens': result.get('output_tokens', 0),
                'cost': result.get('cost', 0),
                'duration_ms': result.get('duration_ms', 0),
            }
            
            # حفظ الجدول والرسم
            draft.table_data = table_data
            draft.chart_config = chart_config
            
            draft.complete_generation(
                content=content,
                ai_metadata=ai_metadata,
                user=user
            )
            
            return draft
            
        except Exception as e:
            draft.status = 'not_started'
            draft.save(update_fields=['status'])
            raise e
    
    def _build_item_prompt_with_components(
        self, 
        item: Item, 
        data: Dict[str, Any],
        components: List[Dict]
    ) -> str:
        """بناء prompt يتضمن طلب كل المكونات"""
        
        base_prompt = item.ai_prompt or self._default_item_prompt()
        
        # تحضير بيانات القيمة
        value_text = ""
        if data['current_value'] is not None:
            value_text = f"القيمة الحالية: {data['current_value']}"
            if data['unit']:
                value_text += f" {data['unit']}"
            
            if data['previous_value'] is not None:
                value_text += f"\nالقيمة السابقة: {data['previous_value']}"
                if data['unit']:
                    value_text += f" {data['unit']}"
                
                if data['change_percentage'] is not None:
                    sign = '+' if data['change_percentage'] > 0 else ''
                    value_text += f"\nنسبة التغير: {sign}{data['change_percentage']}%"
        else:
            value_text = "لا توجد بيانات متاحة"
        
        # بناء طلبات المكونات
        component_requests = []
        for comp in components:
            comp_type = comp.get('type') if isinstance(comp, dict) else comp.type
            
            if comp_type == 'text':
                component_requests.append(
                    "📝 **نص تحليلي**: اكتب فقرة تحليلية (3-5 جمل) تشرح المؤشر وقيمته ودلالته."
                )
            elif comp_type == 'table':
                component_requests.append(
                    "📊 **جدول**: أنشئ جدول بصيغة markdown يوضح البيانات. ابدأه بـ [TABLE] وأنهه بـ [/TABLE]."
                )
            elif comp_type == 'chart':
                component_requests.append(
                    "📈 **رسم بياني**: اقترح نوع الرسم المناسب (bar/pie/line) مع البيانات. ابدأه بـ [CHART] وأنهه بـ [/CHART]."
                )
            elif comp_type == 'image':
                component_requests.append(
                    "🖼️ **صورة**: اقترح وصفاً لصورة مناسبة. ابدأه بـ [IMAGE] وأنهه بـ [/IMAGE]."
                )
        
        components_text = "\n".join(component_requests)
        
        prompt = f"""
{base_prompt}

=== البند ===
الرمز: {data['code']}
الاسم: {data['name']}

=== البيانات ===
{value_text}

=== المطلوب ===
أنشئ المكونات التالية:

{components_text}

قواعد مهمة:
- لا تخترع أرقاماً غير موجودة
- استخدم العلامات [TABLE], [CHART], [IMAGE] لفصل المكونات
- الجدول يجب أن يكون بصيغة markdown
- الرسم البياني: حدد النوع والبيانات بصيغة JSON
"""
        return prompt
    
    def _parse_generated_content(
        self, 
        content: str, 
        item_data: Dict[str, Any],
        components: List[Dict]
    ) -> tuple:
        """تحليل المحتوى المولّد واستخراج الجدول والرسم"""
        import re
        
        table_data = []
        chart_config = {}
        
        # استخراج الجدول
        table_match = re.search(r'\[TABLE\](.*?)\[/TABLE\]', content, re.DOTALL)
        if table_match:
            table_text = table_match.group(1).strip()
            table_data = self._parse_markdown_table(table_text)
        elif any(c.get('type') == 'table' for c in components if isinstance(c, dict)):
            # إنشاء جدول افتراضي من البيانات
            if item_data.get('current_value') is not None:
                table_data = [
                    {'المؤشر': item_data['name'], 'القيمة': item_data['current_value']}
                ]
                if item_data.get('previous_value'):
                    table_data[0]['السنة السابقة'] = item_data['previous_value']
                if item_data.get('change_percentage'):
                    table_data[0]['التغير %'] = item_data['change_percentage']
        
        # استخراج الرسم البياني
        chart_match = re.search(r'\[CHART\](.*?)\[/CHART\]', content, re.DOTALL)
        if chart_match:
            try:
                chart_text = chart_match.group(1).strip()
                # محاولة parse كـ JSON
                import json
                chart_config = json.loads(chart_text)
            except:
                # إنشاء config افتراضي
                pass
        
        # إذا لم يُعثر على رسم، أنشئ واحد افتراضي
        if not chart_config and any(c.get('type') == 'chart' for c in components if isinstance(c, dict)):
            if item_data.get('current_value') is not None:
                chart_config = {
                    'type': 'bar',
                    'data': {
                        'labels': [item_data['name'][:20]],
                        'datasets': [{
                            'label': 'القيمة',
                            'data': [item_data['current_value']],
                            'backgroundColor': '#3B82F6',
                        }]
                    }
                }
                # إضافة السنة السابقة إذا موجودة
                if item_data.get('previous_value'):
                    chart_config['data']['datasets'].append({
                        'label': 'السنة السابقة',
                        'data': [item_data['previous_value']],
                        'backgroundColor': '#9CA3AF',
                    })
        
        return table_data, chart_config
    
    def _parse_markdown_table(self, table_text: str) -> List[Dict]:
        """تحويل جدول markdown إلى list of dicts"""
        lines = [l.strip() for l in table_text.strip().split('\n') if l.strip()]
        if len(lines) < 2:
            return []
        
        # استخراج headers
        header_line = lines[0]
        headers = [h.strip() for h in header_line.split('|') if h.strip()]
        
        # تخطي سطر الفاصل (---)
        data_lines = [l for l in lines[1:] if not l.replace('|', '').replace('-', '').replace(' ', '') == '']
        
        rows = []
        for line in data_lines:
            cells = [c.strip() for c in line.split('|') if c.strip()]
            if len(cells) == len(headers):
                row = dict(zip(headers, cells))
                rows.append(row)
        
        return rows
    
    def _collect_item_data(self, item: Item) -> Dict[str, Any]:
        """جمع بيانات بند واحد"""
        data = {
            'code': item.code,
            'name': item.name,
            'unit': item.unit,
            'field_type': item.field_type,
            'current_value': None,
            'previous_value': None,
            'change_percentage': None,
            'sources': [],
        }
        
        # جمع من DataFile
        files = DataFile.objects.filter(
            item=item,
            submission__period=self.period,
            status='approved',
            is_current=True
        ).select_related('entity')
        
        values = []
        for f in files:
            if f.parsed_data:
                value = f.parsed_data.get('value')
                if value is not None:
                    values.append(value)
                    data['sources'].append({
                        'entity': f.entity.name if f.entity else 'غير محدد',
                        'value': value
                    })
        
        # تجميع القيم
        if values:
            if item.aggregation == 'sum':
                data['current_value'] = sum(values)
            elif item.aggregation == 'average':
                data['current_value'] = sum(values) / len(values)
            elif item.aggregation == 'count':
                data['current_value'] = len(values)
            else:
                data['current_value'] = values[0] if len(values) == 1 else values
        
        # TODO: جلب بيانات السنة السابقة
        
        # حساب نسبة التغير
        if data['current_value'] and data['previous_value']:
            try:
                prev = float(data['previous_value'])
                curr = float(data['current_value'])
                if prev != 0:
                    data['change_percentage'] = round(((curr - prev) / prev) * 100, 2)
            except (ValueError, TypeError):
                pass
        
        return data
    
    def _build_item_prompt(self, item: Item, data: Dict[str, Any]) -> str:
        """بناء prompt لبند واحد"""
        
        base_prompt = item.ai_prompt or self._default_item_prompt()
        
        value_text = ""
        if data['current_value'] is not None:
            value_text = f"القيمة الحالية: {data['current_value']}"
            if data['unit']:
                value_text += f" {data['unit']}"
            
            if data['previous_value'] is not None:
                value_text += f"\nالقيمة السابقة: {data['previous_value']}"
                if data['unit']:
                    value_text += f" {data['unit']}"
                
                if data['change_percentage'] is not None:
                    sign = '+' if data['change_percentage'] > 0 else ''
                    value_text += f"\nنسبة التغير: {sign}{data['change_percentage']}%"
        else:
            value_text = "لا توجد بيانات متاحة"
        
        prompt = f"""
{base_prompt}

=== البند ===
الرمز: {data['code']}
الاسم: {data['name']}

=== البيانات ===
{value_text}

=== المطلوب ===
اكتب فقرة تحليلية قصيرة (2-3 جمل) عن هذا المؤشر.
اذكر القيمة ونسبة التغير إن وجدت.
اربط الرقم بالسياق المؤسسي.
لا تخترع أرقاماً غير موجودة.
"""
        return prompt
    
    def _default_item_prompt(self) -> str:
        """Prompt افتراضي للبنود"""
        return """أنت كاتب تقارير مؤسسية محترف باللغة العربية الفصحى.
اكتب تحليلاً موجزاً لمؤشر أداء واحد."""


# === Utility functions ===

def get_or_create_all_drafts(period: DataCollectionPeriod) -> List[AxisDraft]:
    """
    إنشاء مسودات لكل المحاور (بدون توليد)
    مفيد لعرض قائمة المحاور مع حالاتها
    """
    drafts = []
    for axis in period.template.axes.all().order_by('order'):
        draft, _ = AxisDraft.objects.get_or_create(
            period=period,
            axis=axis,
            defaults={'status': 'not_started'}
        )
        drafts.append(draft)
    return drafts


def get_period_generation_status(period: DataCollectionPeriod) -> Dict[str, Any]:
    """
    حالة توليد التقرير لفترة معينة (محاور + بنود)
    """
    axes = period.template.axes.all()
    axis_drafts = AxisDraft.objects.filter(period=period)
    
    total_axes = axes.count()
    generated_axes = axis_drafts.filter(status__in=['generated', 'edited', 'approved']).count()
    approved_axes = axis_drafts.filter(status='approved').count()
    
    # بنود
    total_items = Item.objects.filter(axis__template=period.template).count()
    item_drafts = ItemDraft.objects.filter(period=period)
    generated_items = item_drafts.filter(status__in=['generated', 'edited', 'approved']).count()
    approved_items = item_drafts.filter(status='approved').count()
    
    return {
        # محاور
        'total_axes': total_axes,
        'generated_axes': generated_axes,
        'approved_axes': approved_axes,
        'not_started_axes': total_axes - generated_axes,
        'axes_progress': round((generated_axes / total_axes) * 100, 1) if total_axes > 0 else 0,
        
        # بنود
        'total_items': total_items,
        'generated_items': generated_items,
        'approved_items': approved_items,
        'not_started_items': total_items - generated_items,
        'items_progress': round((generated_items / total_items) * 100, 1) if total_items > 0 else 0,
        
        # عام (للتوافق)
        'generated': generated_axes,
        'approved': approved_axes,
        'not_started': total_axes - generated_axes,
        'progress_percentage': round((generated_axes / total_axes) * 100, 1) if total_axes > 0 else 0,
        'is_complete': generated_axes == total_axes,
        'is_approved': approved_axes == total_axes,
    }


def get_or_create_item_drafts(period: DataCollectionPeriod, axis_id: int = None) -> List[ItemDraft]:
    """
    إنشاء مسودات لكل البنود (بدون توليد)
    """
    if axis_id:
        items = Item.objects.filter(axis_id=axis_id)
    else:
        items = Item.objects.filter(axis__template=period.template)
    
    items = items.order_by('axis__order', 'order')
    
    drafts = []
    for item in items:
        draft, _ = ItemDraft.objects.get_or_create(
            period=period,
            item=item,
            defaults={'status': 'not_started'}
        )
        drafts.append(draft)
    return drafts
