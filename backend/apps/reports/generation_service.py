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
from .models import AxisDraft, ItemDraft, Project, Response

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
        has_table = False
        has_chart = False
        for comp in components:
            comp_type = comp.get('type') if isinstance(comp, dict) else comp.type
            if comp_type == 'table':
                has_table = True
            elif comp_type == 'chart':
                has_chart = True

        extra_instructions = ""
        if has_table:
            extra_instructions += "\n- أضف جدولاً بصيغة markdown (| عمود | عمود |) يلخص البيانات الرقمية. ضعه بين [TABLE] و [/TABLE]."
        if has_chart:
            extra_instructions += "\n- أضف رسماً بيانياً بصيغة JSON بين [CHART] و [/CHART]. مثال: [CHART]{\"type\": \"bar\", \"data\": {\"labels\": [...], \"values\": [...]}}[/CHART]"

        prompt = f"""
{base_prompt}

=== البند ===
الرمز: {data['code']}
الاسم: {data['name']}

=== البيانات ===
{value_text}

=== المطلوب ===
اكتب محتوى هذا البند للتقرير السنوي.

أسلوب الكتابة:
- ابدأ مباشرة بذكر القيمة والتفاصيل. لا تكرر عنوان البند.
- اذكر الأرقام بين قوسين: (52) برنامجاً
- قارن بين القيمة الحالية والسابقة مع ذكر نسبة التغير
- استخدم قوائم نقطية إذا كانت هناك تفاصيل متعددة
- اكتب بأسلوب رسمي مؤسسي (بلغ عدد... حققت الجامعة... وقد شهد...)
- إذا لا توجد بيانات، اذكر ذلك بوضوح مع توصية
- لا تخترع أرقاماً أو تفاصيل غير موجودة في البيانات
- أضف جدولاً بصيغة markdown (| عمود | عمود |) لتلخيص البيانات الرقمية والمقارنات إذا كانت مناسبة
- لا تضع [TABLE] أو [CHART] أو JSON — استخدم فقط جداول markdown عادية{extra_instructions}
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
        return """أنت كاتب تقارير سنوية مؤسسية محترف باللغة العربية الفصحى.
اكتب محتوى بند واحد من التقرير السنوي بأسلوب رسمي مباشر."""


class ProjectGenerationService:
    """
    خدمة توليد محتوى التقارير من نظام Project/Response
    تقرأ البيانات من Response بدلاً من DataFile
    """

    def __init__(self, project: Project, model: str = None):
        self.project = project
        self.template = project.template
        self.model = model or DEFAULT_AI_MODEL

    def generate_axes(
        self,
        axis_ids: Optional[List[int]] = None,
        regenerate: bool = False,
        user=None
    ) -> Dict[str, Any]:
        """توليد محاور معينة أو الكل"""
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

        if results['errors'] and not results['drafts']:
            results['status'] = 'failed'
            results['message'] = 'فشل توليد جميع المحاور'
        elif results['errors']:
            results['status'] = 'partial'
            results['message'] = f"تم توليد {len(results['drafts'])} من {len(axes)} محاور"
        else:
            results['message'] = f"تم توليد {len(results['drafts'])} محاور بنجاح"

        return results

    def _generate_single_axis(self, axis: Axis, regenerate: bool = False, user=None) -> AxisDraft:
        """توليد محور واحد"""
        draft, created = AxisDraft.objects.get_or_create(
            project=self.project,
            axis=axis,
            defaults={'status': 'not_started'}
        )

        if not regenerate and draft.status in ['generated', 'edited', 'approved']:
            if not draft.is_data_changed:
                return draft

        draft.start_generation(user)

        try:
            axis_data = self._collect_axis_data(axis)
            draft.source_data = axis_data

            prompt = self._build_prompt(axis, axis_data)

            if self.model == 'gemini':
                result = generate_with_gemini(prompt, word_count=800)
            elif self.model == 'cli':
                result = generate_with_cli(prompt, word_count=800)
            else:
                result = generate_with_gemini(prompt, word_count=800)

            if not result.get('success', False):
                raise Exception(result.get('error', 'فشل التوليد'))

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
            draft.status = 'not_started'
            draft.save(update_fields=['status'])
            raise e

    def _collect_axis_data(self, axis: Axis) -> Dict[str, Any]:
        """جمع بيانات المحور من Response"""
        data = {
            'axis': {
                'code': axis.code,
                'name': axis.name,
                'description': axis.description,
            },
            'project': {
                'name': self.project.name,
                'period': self.project.period,
            },
            'items': [],
            'tables': [],
            'previous_year': {},
        }

        for item in axis.items.all().order_by('order'):
            item_data = {
                'code': item.code,
                'name': item.name,
                'unit': item.unit,
                'field_type': item.field_type,
                'current_value': None,
                'previous_value': None,
                'change_percentage': None,
                'sources': [],
            }

            # جمع من Response
            responses = Response.objects.filter(
                project=self.project,
                item=item,
            ).select_related('contributor', 'contributor__entity')

            values = []
            for resp in responses:
                raw = resp.get_display_value()

                # Handle dict format: {'current': 52, 'previous': 43, 'change': '21%'}
                if isinstance(raw, dict):
                    current = raw.get('current') or raw.get('value')
                    previous = raw.get('previous')
                    change = raw.get('change')

                    if current is not None:
                        try:
                            numeric_val = float(current)
                            values.append(numeric_val)
                        except (ValueError, TypeError):
                            values.append(current)

                        item_data['sources'].append({
                            'entity': resp.contributor.entity.name,
                            'value': current
                        })

                    # Store previous value directly from response
                    if previous is not None and item_data['previous_value'] is None:
                        try:
                            item_data['previous_value'] = float(previous)
                        except (ValueError, TypeError):
                            item_data['previous_value'] = previous

                    # Store change percentage directly from response
                    if change is not None and item_data['change_percentage'] is None:
                        try:
                            item_data['change_percentage'] = float(str(change).replace('%', ''))
                        except (ValueError, TypeError):
                            pass
                else:
                    # Simple value (string, number)
                    val = raw
                    if val is not None:
                        try:
                            numeric_val = float(val)
                            values.append(numeric_val)
                        except (ValueError, TypeError):
                            values.append(val)

                        item_data['sources'].append({
                            'entity': resp.contributor.entity.name,
                            'value': val
                        })

            # تجميع القيم حسب نوع التجميع
            numeric_values = [v for v in values if isinstance(v, (int, float))]
            if numeric_values:
                if item.aggregation == 'sum':
                    item_data['current_value'] = sum(numeric_values)
                elif item.aggregation == 'average':
                    item_data['current_value'] = sum(numeric_values) / len(numeric_values)
                elif item.aggregation == 'count':
                    item_data['current_value'] = len(numeric_values)
                elif item.aggregation == 'latest':
                    item_data['current_value'] = numeric_values[-1]
                else:
                    item_data['current_value'] = numeric_values[0] if len(numeric_values) == 1 else numeric_values
            elif values:
                item_data['current_value'] = values[0] if len(values) == 1 else values

            # حساب نسبة التغير إن لم تكن مخزنة مسبقاً
            if item_data['current_value'] and item_data['previous_value'] and item_data['change_percentage'] is None:
                try:
                    prev = float(item_data['previous_value'])
                    curr = float(item_data['current_value'])
                    if prev != 0:
                        item_data['change_percentage'] = round(((curr - prev) / prev) * 100, 2)
                except (ValueError, TypeError):
                    pass

            data['items'].append(item_data)

        return data

    def _collect_item_data(self, item: Item) -> Dict[str, Any]:
        """جمع بيانات بند واحد من Response"""
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

        responses = Response.objects.filter(
            project=self.project,
            item=item,
        ).select_related('contributor', 'contributor__entity')

        values = []
        for resp in responses:
            raw = resp.get_display_value()

            # Handle dict format: {'current': 52, 'previous': 43, 'change': '21%'}
            if isinstance(raw, dict):
                current = raw.get('current') or raw.get('value')
                previous = raw.get('previous')
                change = raw.get('change')

                if current is not None:
                    try:
                        numeric_val = float(current)
                        values.append(numeric_val)
                    except (ValueError, TypeError):
                        values.append(current)

                    data['sources'].append({
                        'entity': resp.contributor.entity.name,
                        'value': current
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
                        numeric_val = float(val)
                        values.append(numeric_val)
                    except (ValueError, TypeError):
                        values.append(val)

                    data['sources'].append({
                        'entity': resp.contributor.entity.name,
                        'value': val
                    })

        numeric_values = [v for v in values if isinstance(v, (int, float))]
        if numeric_values:
            if item.aggregation == 'sum':
                data['current_value'] = sum(numeric_values)
            elif item.aggregation == 'average':
                data['current_value'] = sum(numeric_values) / len(numeric_values)
            elif item.aggregation == 'count':
                data['current_value'] = len(numeric_values)
            else:
                data['current_value'] = numeric_values[0] if len(numeric_values) == 1 else numeric_values
        elif values:
            data['current_value'] = values[0] if len(values) == 1 else values

        if data['current_value'] and data['previous_value'] and data['change_percentage'] is None:
            try:
                prev = float(data['previous_value'])
                curr = float(data['current_value'])
                if prev != 0:
                    data['change_percentage'] = round(((curr - prev) / prev) * 100, 2)
            except (ValueError, TypeError):
                pass

        return data

    def _build_prompt(self, axis: Axis, data: Dict[str, Any]) -> str:
        """بناء prompt للـ AI"""
        base_prompt = axis.ai_prompt or self._default_axis_prompt()
        items_text = self._format_items_for_prompt(data['items'])

        prompt = f"""
{base_prompt}

=== معلومات المحور ===
المحور: {data['axis']['name']}
المؤسسة: {data['project']['name']}
الفترة: {data['project']['period']}

=== بيانات المؤشرات ===
{items_text}

=== المطلوب ===
اكتب محتوى هذا المحور للتقرير السنوي.

أسلوب الكتابة (مهم جداً - اتبعه بدقة):
- لا تكتب مقدمة عامة للمحور ولا خاتمة. ادخل مباشرة في تحليل كل مؤشر.
- لكل مؤشر: ابدأ بذكر القيمة الفعلية والتفاصيل المباشرة
- اذكر الأرقام بصيغة رقمية واضحة مثل: (52) برنامجاً، بنسبة (21%)
- استخدم القوائم النقطية لعرض التفاصيل (أسماء البرامج، الجهات، التواريخ)
- اربط بين البيانات الحالية والسابقة مع ذكر نسبة التغير
- إذا لا توجد بيانات لمؤشر، اذكر ذلك بوضوح مع توصية بجمع البيانات
- لا تضع عناوين فرعية عامة مثل "الإنجازات" أو "التحديات" - بل ادمجها في سياق تحليل كل مؤشر
- اكتب بأسلوب التقارير الرسمية المؤسسية (بلغ عدد... حققت الجامعة... وقد شهد...)
- لا تخترع أرقاماً أو تفاصيل غير موجودة في البيانات
- لا تضع [TABLE] أو [CHART] أو أي JSON في النص
- أضف جداول بصيغة markdown (باستخدام | عمود1 | عمود2 |) عندما تكون البيانات مناسبة لعرضها في جدول (مثل: مقارنات بين سنوات، توزيعات حسب كليات/أقسام، إحصاءات متعددة)
- رقّم الجداول: جدول (رقم المحور-رقم تسلسلي)، مثال: جدول (1-1): عنوان الجدول
"""
        return prompt

    def _default_axis_prompt(self) -> str:
        return """أنت كاتب تقارير سنوية مؤسسية محترف باللغة العربية الفصحى.
مهمتك كتابة محتوى محور من محاور التقرير السنوي بأسلوب التقارير الرسمية.

قواعد الكتابة:
- استخدم اللغة العربية الفصحى الرسمية
- كن دقيقاً في ذكر الأرقام بين قوسين: (52) برنامجاً
- استخدم صيغة الغائب (حققت الجامعة، بلغ عدد...)
- اذكر التفاصيل الواقعية من البيانات المقدمة فقط
- لا تكتب مقدمات أو خواتم عامة - ادخل مباشرة في صلب كل مؤشر"""

    def _format_items_for_prompt(self, items: List[Dict]) -> str:
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

    def generate_items(
        self,
        item_ids: Optional[List[int]] = None,
        axis_id: Optional[int] = None,
        regenerate: bool = False,
        user=None
    ) -> Dict[str, Any]:
        """توليد بنود معينة أو كل بنود محور أو الكل"""
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

        if results['errors'] and not results['drafts']:
            results['status'] = 'failed'
            results['message'] = 'فشل توليد جميع البنود'
        elif results['errors']:
            results['status'] = 'partial'
            results['message'] = f"تم توليد {len(results['drafts'])} من {items.count()} بند"
        else:
            results['message'] = f"تم توليد {len(results['drafts'])} بند بنجاح"

        return results

    def _generate_single_item(self, item: Item, regenerate: bool = False, user=None) -> ItemDraft:
        """توليد بند واحد"""
        draft, created = ItemDraft.objects.get_or_create(
            project=self.project,
            item=item,
            defaults={'status': 'not_started'}
        )

        if not regenerate and draft.status in ['generated', 'edited', 'approved']:
            return draft

        draft.status = 'generating'
        draft.save(update_fields=['status'])

        try:
            item_data = self._collect_item_data(item)

            if item_data.get('current_value') is not None:
                draft.current_value = item_data.get('current_value')
            if draft.current_value is not None:
                item_data['current_value'] = draft.current_value

            if item_data.get('previous_value') is not None:
                draft.previous_value = item_data.get('previous_value')
            if draft.previous_value is not None:
                item_data['previous_value'] = draft.previous_value

            if item_data.get('change_percentage') is not None:
                draft.change_percentage = Decimal(str(item_data['change_percentage']))

            output_template = draft.output_template
            if not output_template:
                from .models import OutputTemplate
                output_template = OutputTemplate.objects.filter(is_default=True).first()

            components = []
            if output_template:
                components = list(output_template.components.all().order_by('order'))

            if not components:
                components = [{'type': 'text', 'source': 'auto'}]
            else:
                components = [{'type': c.type, 'source': c.source, 'title': c.title} for c in components]

            prompt = self._build_item_prompt_with_components(item, item_data, components)

            if self.model == 'gemini':
                result = generate_with_gemini(prompt, word_count=400)
            else:
                result = generate_with_cli(prompt, word_count=400)

            if not result.get('success', False):
                raise Exception(result.get('error', 'فشل التوليد'))

            content = result.get('content', '')
            table_data, chart_config = self._parse_generated_content(content, item_data, components)

            ai_metadata = {
                'model': result.get('model', self.model),
                'input_tokens': result.get('input_tokens', 0),
                'output_tokens': result.get('output_tokens', 0),
                'cost': result.get('cost', 0),
                'duration_ms': result.get('duration_ms', 0),
            }

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

    def _build_item_prompt_with_components(self, item, data, components):
        """Delegate to GenerationService's static method"""
        # Reuse the same prompt logic
        svc = GenerationService.__new__(GenerationService)
        return svc._build_item_prompt_with_components(item, data, components)

    def _parse_generated_content(self, content, item_data, components):
        """Delegate to GenerationService's static method"""
        svc = GenerationService.__new__(GenerationService)
        return svc._parse_generated_content(content, item_data, components)


# === Utility functions ===

def get_or_create_project_drafts(project: Project) -> List[AxisDraft]:
    """إنشاء مسودات لكل المحاور في مشروع (بدون توليد)"""
    drafts = []
    for axis in project.template.axes.all().order_by('order'):
        draft, _ = AxisDraft.objects.get_or_create(
            project=project,
            axis=axis,
            defaults={'status': 'not_started'}
        )
        drafts.append(draft)
    return drafts


def get_project_generation_status(project: Project) -> Dict[str, Any]:
    """حالة توليد التقرير لمشروع معين"""
    axes = project.template.axes.all()
    axis_drafts = AxisDraft.objects.filter(project=project)

    total_axes = axes.count()
    generated_axes = axis_drafts.filter(status__in=['generated', 'edited', 'approved']).count()
    approved_axes = axis_drafts.filter(status='approved').count()

    total_items = Item.objects.filter(axis__template=project.template).count()
    item_drafts = ItemDraft.objects.filter(project=project)
    generated_items = item_drafts.filter(status__in=['generated', 'edited', 'approved']).count()
    approved_items = item_drafts.filter(status='approved').count()

    return {
        'total_axes': total_axes,
        'generated_axes': generated_axes,
        'approved_axes': approved_axes,
        'not_started_axes': total_axes - generated_axes,
        'axes_progress': round((generated_axes / total_axes) * 100, 1) if total_axes > 0 else 0,
        'total_items': total_items,
        'generated_items': generated_items,
        'approved_items': approved_items,
        'not_started_items': total_items - generated_items,
        'items_progress': round((generated_items / total_items) * 100, 1) if total_items > 0 else 0,
        'generated': generated_axes,
        'approved': approved_axes,
        'not_started': total_axes - generated_axes,
        'progress_percentage': round((generated_axes / total_axes) * 100, 1) if total_axes > 0 else 0,
        'is_complete': generated_axes == total_axes,
        'is_approved': approved_axes == total_axes,
    }


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
