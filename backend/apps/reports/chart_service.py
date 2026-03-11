"""
Chart Generation Service
خدمة توليد الرسوم البيانية

المميزات:
- توليد رسوم بيانية من البيانات
- دعم أنواع متعددة (Bar, Pie, Line, Area)
- تصدير كصور PNG للـ Word
- دعم العربية (RTL)
"""

import io
import os
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from matplotlib import rcParams
import numpy as np
from PIL import Image

# إعدادات الخطوط العربية
plt.rcParams['font.family'] = 'Arial'
plt.rcParams['axes.unicode_minus'] = False


class ChartService:
    """خدمة توليد الرسوم البيانية"""
    
    # ألوان جامعة البترا
    COLORS = [
        '#003366',  # أزرق داكن (الأساسي)
        '#0066CC',  # أزرق
        '#66B2FF',  # أزرق فاتح
        '#FF6600',  # برتقالي
        '#FFB366',  # برتقالي فاتح
        '#00CC66',  # أخضر
        '#FF3366',  # أحمر
        '#9933FF',  # بنفسجي
        '#FFCC00',  # أصفر
        '#00CCCC',  # سماوي
    ]
    
    def __init__(self, output_dir: str = None):
        self.output_dir = Path(output_dir) if output_dir else Path('/tmp/charts')
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_bar_chart(
        self,
        data: Dict[str, float],
        title: str = '',
        xlabel: str = '',
        ylabel: str = '',
        horizontal: bool = False,
        show_values: bool = True,
        figsize: Tuple[int, int] = (10, 6),
        comparison_data: Dict[str, float] = None,
    ) -> bytes:
        """
        توليد رسم بياني شريطي
        
        Args:
            data: البيانات {التسمية: القيمة}
            title: عنوان الرسم
            xlabel: تسمية المحور السيني
            ylabel: تسمية المحور الصادي
            horizontal: أفقي أم عمودي
            show_values: عرض القيم على الأعمدة
            figsize: حجم الصورة
            comparison_data: بيانات المقارنة (السنة السابقة)
        
        Returns:
            PNG bytes
        """
        fig, ax = plt.subplots(figsize=figsize)
        
        labels = list(data.keys())
        values = list(data.values())
        x = np.arange(len(labels))
        
        if comparison_data:
            # رسم مقارنة
            width = 0.35
            comparison_values = [comparison_data.get(label, 0) for label in labels]
            
            if horizontal:
                bars1 = ax.barh(x - width/2, values, width, label='الحالي', color=self.COLORS[0])
                bars2 = ax.barh(x + width/2, comparison_values, width, label='السابق', color=self.COLORS[1])
                ax.set_yticks(x)
                ax.set_yticklabels(labels)
            else:
                bars1 = ax.bar(x - width/2, values, width, label='الحالي', color=self.COLORS[0])
                bars2 = ax.bar(x + width/2, comparison_values, width, label='السابق', color=self.COLORS[1])
                ax.set_xticks(x)
                ax.set_xticklabels(labels, rotation=45, ha='right')
            
            ax.legend()
            
            if show_values:
                self._add_bar_labels(ax, bars1, horizontal)
                self._add_bar_labels(ax, bars2, horizontal)
        else:
            # رسم عادي
            colors = [self.COLORS[i % len(self.COLORS)] for i in range(len(values))]
            
            if horizontal:
                bars = ax.barh(labels, values, color=colors)
            else:
                bars = ax.bar(labels, values, color=colors)
                plt.xticks(rotation=45, ha='right')
            
            if show_values:
                self._add_bar_labels(ax, bars, horizontal)
        
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        
        # RTL support
        ax.invert_xaxis() if not horizontal else None
        
        plt.tight_layout()
        
        return self._fig_to_bytes(fig)
    
    def generate_pie_chart(
        self,
        data: Dict[str, float],
        title: str = '',
        show_percentages: bool = True,
        show_legend: bool = True,
        explode_max: bool = False,
        figsize: Tuple[int, int] = (8, 8),
    ) -> bytes:
        """
        توليد رسم دائري
        
        Args:
            data: البيانات {التسمية: القيمة}
            title: عنوان الرسم
            show_percentages: عرض النسب المئوية
            show_legend: عرض المفتاح
            explode_max: إبراز أكبر قيمة
            figsize: حجم الصورة
        
        Returns:
            PNG bytes
        """
        fig, ax = plt.subplots(figsize=figsize)
        
        labels = list(data.keys())
        values = list(data.values())
        colors = [self.COLORS[i % len(self.COLORS)] for i in range(len(values))]
        
        # Explode largest slice
        explode = None
        if explode_max and values:
            max_idx = values.index(max(values))
            explode = [0.05 if i == max_idx else 0 for i in range(len(values))]
        
        autopct = '%1.1f%%' if show_percentages else None
        
        wedges, texts, autotexts = ax.pie(
            values,
            labels=labels if not show_legend else None,
            autopct=autopct,
            colors=colors,
            explode=explode,
            startangle=90,
            counterclock=False,  # RTL
        )
        
        if show_legend:
            ax.legend(
                wedges, labels,
                title="",
                loc="center left",
                bbox_to_anchor=(1, 0, 0.5, 1)
            )
        
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        
        plt.tight_layout()
        
        return self._fig_to_bytes(fig)
    
    def generate_line_chart(
        self,
        data: Dict[str, List[float]],
        x_labels: List[str],
        title: str = '',
        xlabel: str = '',
        ylabel: str = '',
        show_markers: bool = True,
        fill_area: bool = False,
        figsize: Tuple[int, int] = (12, 6),
    ) -> bytes:
        """
        توليد رسم خطي
        
        Args:
            data: البيانات {اسم السلسلة: [القيم]}
            x_labels: تسميات المحور السيني
            title: عنوان الرسم
            xlabel: تسمية المحور السيني
            ylabel: تسمية المحور الصادي
            show_markers: عرض النقاط
            fill_area: تعبئة المنطقة تحت الخط
            figsize: حجم الصورة
        
        Returns:
            PNG bytes
        """
        fig, ax = plt.subplots(figsize=figsize)
        
        x = np.arange(len(x_labels))
        
        for i, (label, values) in enumerate(data.items()):
            color = self.COLORS[i % len(self.COLORS)]
            marker = 'o' if show_markers else None
            
            line, = ax.plot(x, values, label=label, color=color, marker=marker, linewidth=2)
            
            if fill_area:
                ax.fill_between(x, values, alpha=0.3, color=color)
        
        ax.set_xticks(x)
        ax.set_xticklabels(x_labels, rotation=45, ha='right')
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        
        if len(data) > 1:
            ax.legend()
        
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        return self._fig_to_bytes(fig)
    
    def generate_comparison_chart(
        self,
        current_value: float,
        previous_value: float,
        label: str,
        title: str = '',
        show_change: bool = True,
        figsize: Tuple[int, int] = (8, 5),
    ) -> bytes:
        """
        توليد رسم مقارنة بين سنتين
        
        Args:
            current_value: القيمة الحالية
            previous_value: القيمة السابقة
            label: تسمية المؤشر
            title: عنوان الرسم
            show_change: عرض نسبة التغير
            figsize: حجم الصورة
        
        Returns:
            PNG bytes
        """
        fig, ax = plt.subplots(figsize=figsize)
        
        x = ['السنة السابقة', 'السنة الحالية']
        values = [previous_value, current_value]
        colors = [self.COLORS[1], self.COLORS[0]]
        
        bars = ax.bar(x, values, color=colors, width=0.5)
        
        # إضافة القيم على الأعمدة
        for bar, val in zip(bars, values):
            height = bar.get_height()
            ax.annotate(
                f'{val:,.0f}',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),
                textcoords="offset points",
                ha='center', va='bottom',
                fontsize=12, fontweight='bold'
            )
        
        # عرض نسبة التغير
        if show_change and previous_value > 0:
            change = ((current_value - previous_value) / previous_value) * 100
            change_text = f'+{change:.1f}%' if change > 0 else f'{change:.1f}%'
            change_color = '#00CC66' if change > 0 else '#FF3366'
            
            ax.annotate(
                change_text,
                xy=(1, current_value),
                xytext=(0, 20),
                textcoords="offset points",
                ha='center', va='bottom',
                fontsize=14, fontweight='bold',
                color=change_color,
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor=change_color)
            )
        
        ax.set_title(title or label, fontsize=14, fontweight='bold', pad=20)
        ax.set_ylabel('القيمة')
        
        plt.tight_layout()
        
        return self._fig_to_bytes(fig)
    
    def generate_from_item_draft(self, item_draft, chart_type: str = 'auto') -> Optional[bytes]:
        """
        توليد رسم بياني من مسودة بند
        
        Args:
            item_draft: مسودة البند
            chart_type: نوع الرسم (auto, bar, pie, line, comparison)
        
        Returns:
            PNG bytes or None
        """
        # تحديد نوع الرسم تلقائياً
        if chart_type == 'auto':
            if item_draft.previous_value is not None:
                chart_type = 'comparison'
            elif item_draft.table_data:
                chart_type = 'bar'
            else:
                return None
        
        # مقارنة بين سنتين
        if chart_type == 'comparison':
            if item_draft.current_value and item_draft.previous_value:
                return self.generate_comparison_chart(
                    current_value=float(item_draft.current_value),
                    previous_value=float(item_draft.previous_value),
                    label=item_draft.item.name,
                    title=f'مقارنة: {item_draft.item.name}'
                )
        
        # رسم شريطي من الجدول
        if chart_type == 'bar' and item_draft.table_data:
            # محاولة استخراج البيانات من الجدول
            data = self._extract_chart_data(item_draft.table_data)
            if data:
                return self.generate_bar_chart(
                    data=data,
                    title=item_draft.item.name
                )
        
        # رسم دائري
        if chart_type == 'pie' and item_draft.table_data:
            data = self._extract_chart_data(item_draft.table_data)
            if data:
                return self.generate_pie_chart(
                    data=data,
                    title=item_draft.item.name
                )
        
        return None
    
    def _extract_chart_data(self, table_data: List[Dict]) -> Optional[Dict[str, float]]:
        """استخراج بيانات الرسم من جدول"""
        if not table_data:
            return None
        
        # محاولة إيجاد أعمدة مناسبة
        first_row = table_data[0]
        keys = list(first_row.keys())
        
        # البحث عن عمود التسمية وعمود القيمة
        label_col = None
        value_col = None
        
        for key in keys:
            if any(word in key.lower() for word in ['اسم', 'البند', 'الوصف', 'النوع', 'name']):
                label_col = key
            elif any(word in key.lower() for word in ['عدد', 'مبلغ', 'قيمة', 'نسبة', 'count', 'value', 'amount']):
                value_col = key
        
        # إذا لم نجد، نستخدم أول عمودين
        if not label_col:
            label_col = keys[0]
        if not value_col and len(keys) > 1:
            value_col = keys[1]
        
        if not value_col:
            return None
        
        # استخراج البيانات
        data = {}
        for row in table_data[:10]:  # أول 10 صفوف فقط
            label = str(row.get(label_col, ''))[:30]  # قص التسمية
            try:
                value = float(row.get(value_col, 0))
                if label and value:
                    data[label] = value
            except (ValueError, TypeError):
                continue
        
        return data if data else None
    
    def _add_bar_labels(self, ax, bars, horizontal: bool = False):
        """إضافة تسميات على الأعمدة"""
        for bar in bars:
            if horizontal:
                width = bar.get_width()
                ax.annotate(
                    f'{width:,.0f}',
                    xy=(width, bar.get_y() + bar.get_height() / 2),
                    xytext=(3, 0),
                    textcoords="offset points",
                    ha='left', va='center',
                    fontsize=9
                )
            else:
                height = bar.get_height()
                ax.annotate(
                    f'{height:,.0f}',
                    xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 3),
                    textcoords="offset points",
                    ha='center', va='bottom',
                    fontsize=9
                )
    
    def _fig_to_bytes(self, fig) -> bytes:
        """تحويل الرسم إلى bytes"""
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()
    
    def save_chart(self, chart_bytes: bytes, filename: str) -> Path:
        """حفظ الرسم كملف"""
        filepath = self.output_dir / filename
        with open(filepath, 'wb') as f:
            f.write(chart_bytes)
        return filepath


# ============================================
# دوال مساعدة
# ============================================

def generate_all_charts_for_period(period_id: int, output_dir: str = None) -> Dict[str, Any]:
    """
    توليد كل الرسوم البيانية لفترة معينة
    
    Args:
        period_id: معرف الفترة
        output_dir: مجلد الإخراج
    
    Returns:
        نتائج التوليد
    """
    from apps.data_collection.models import DataCollectionPeriod
    from apps.reports.models import ItemDraft
    
    period = DataCollectionPeriod.objects.get(id=period_id)
    service = ChartService(output_dir)
    
    results = {
        'generated': [],
        'skipped': [],
        'errors': [],
    }
    
    # توليد رسم لكل بند له بيانات
    for draft in ItemDraft.objects.filter(period=period):
        try:
            # محاولة توليد رسم مقارنة
            if draft.current_value and draft.previous_value:
                chart_bytes = service.generate_from_item_draft(draft, 'comparison')
                if chart_bytes:
                    filename = f"chart_{draft.item.code.replace('.', '_')}_comparison.png"
                    filepath = service.save_chart(chart_bytes, filename)
                    results['generated'].append({
                        'item': draft.item.code,
                        'type': 'comparison',
                        'file': str(filepath)
                    })
                    continue
            
            # محاولة توليد رسم شريطي من الجدول
            if draft.table_data:
                chart_bytes = service.generate_from_item_draft(draft, 'bar')
                if chart_bytes:
                    filename = f"chart_{draft.item.code.replace('.', '_')}_bar.png"
                    filepath = service.save_chart(chart_bytes, filename)
                    results['generated'].append({
                        'item': draft.item.code,
                        'type': 'bar',
                        'file': str(filepath)
                    })
                    continue
            
            results['skipped'].append({
                'item': draft.item.code,
                'reason': 'لا توجد بيانات كافية للرسم'
            })
            
        except Exception as e:
            results['errors'].append({
                'item': draft.item.code,
                'error': str(e)
            })
    
    return results
