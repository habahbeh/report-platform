"""
HTML Report Generator - توليد تقارير HTML كاملة مع رسوم بيانية CSS
"""

import json
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any


def generate_full_report_html(period, include_css: bool = True) -> str:
    """
    توليد تقرير HTML كامل من فترة جمع البيانات.
    
    Args:
        period: DataCollectionPeriod instance
        include_css: تضمين CSS في الملف
    
    Returns:
        HTML string
    """
    from apps.reports.models import ItemDraft, AxisDraft
    
    template = period.template
    org_name = period.organization.name if period.organization else template.organization.name if template.organization else ''
    
    # جمع المحتوى
    axes_html = ''
    for axis in template.axes.all().order_by('order'):
        axis_html = generate_axis_html(axis, period)
        if axis_html:
            axes_html += axis_html
    
    # بناء HTML الكامل
    css = get_report_css() if include_css else ''
    
    html = f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{template.name} - {period.academic_year}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    {f'<style>{css}</style>' if include_css else ''}
</head>
<body>
    <header class="report-header">
        <h1>{template.name}</h1>
        <p class="subtitle">{org_name}</p>
        <p class="period">العام الجامعي {period.academic_year}</p>
    </header>
    
    <main class="report-content">
        {axes_html}
    </main>
    
    <footer class="report-footer">
        <p>تم توليد هذا التقرير بتاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}</p>
    </footer>
</body>
</html>'''
    
    return html


def generate_axis_html(axis, period) -> str:
    """توليد HTML لمحور واحد."""
    from apps.reports.models import ItemDraft
    
    items_html = ''
    for item in axis.items.all().order_by('order'):
        item_html = generate_item_html(item, period)
        if item_html:
            items_html += item_html
    
    if not items_html:
        return ''
    
    return f'''
    <section class="axis" id="axis-{axis.code}">
        <h2 class="axis-title">المحور {axis.code}: {axis.name}</h2>
        {items_html}
    </section>
    '''


def generate_item_html(item, period) -> str:
    """توليد HTML لبند واحد باستخدام manual_content المرتب."""
    from apps.reports.models import ItemDraft
    
    # جلب المسودة
    try:
        draft = ItemDraft.objects.get(period=period, item=item)
    except ItemDraft.DoesNotExist:
        draft = None
    
    if not draft:
        return ''
    
    # إذا يوجد manual_content مع مكونات متعددة، استخدمها
    if draft.manual_content and isinstance(draft.manual_content, list) and len(draft.manual_content) > 0:
        return generate_item_from_components(item, draft.manual_content)
    
    # وإلا استخدم الطريقة القديمة
    return generate_item_html_legacy(item, draft)


def generate_item_from_components(item, components: list) -> str:
    """توليد HTML من قائمة المكونات المرتبة."""
    
    # التأكد من أن كل عنصر هو dict
    valid_components = [c for c in components if isinstance(c, dict)]
    
    if not valid_components:
        return ''
    
    # ترتيب المكونات
    sorted_components = sorted(valid_components, key=lambda x: x.get('order', 0))
    
    components_html = ''
    
    for comp in sorted_components:
        comp_type = comp.get('type', '')
        
        if comp_type == 'text':
            content = comp.get('content', '')
            if content:
                components_html += f'''
                <div class="item-text">
                    {format_text_content(content)}
                </div>
                '''
        
        elif comp_type == 'chart':
            chart_config = {
                'type': comp.get('chart_type', 'bar'),
                'title': comp.get('title', ''),
                'data': comp.get('data', []),
                'labels': comp.get('labels', []),
                'colors': comp.get('colors', [])
            }
            chart_html = generate_chart_html(chart_config, item.code)
            if chart_html:
                components_html += chart_html
        
        elif comp_type == 'table':
            title = comp.get('title', '')
            headers = comp.get('headers', [])
            rows = comp.get('rows', [])
            
            if rows:
                table_data = {'headers': headers, 'rows': rows}
                table_html = generate_table_html_from_dict(table_data, item.code, title)
                if table_html:
                    components_html += table_html
        
        elif comp_type == 'image':
            url = comp.get('url', '')
            caption = comp.get('caption', '')
            if url:
                components_html += f'''
                <figure class="item-image">
                    <img src="{url}" alt="{caption}">
                    <figcaption>{caption}</figcaption>
                </figure>
                '''
    
    if not components_html:
        return ''
    
    return f'''
    <article class="item" id="item-{item.code}">
        <h3 class="item-title">{item.code}: {item.name}</h3>
        {components_html}
    </article>
    '''


def generate_table_html_from_dict(table_data: dict, item_code: str, title: str = '') -> str:
    """توليد جدول HTML من dict مع headers و rows."""
    headers = table_data.get('headers', [])
    rows = table_data.get('rows', [])
    
    if not rows:
        return ''
    
    # بناء header
    header_html = ''
    if headers:
        header_cells = ''.join([f'<th>{h}</th>' for h in headers])
        header_html = f'<thead><tr>{header_cells}</tr></thead>'
    
    # بناء الصفوف
    rows_html = ''
    for i, row in enumerate(rows):
        cells = ''.join([f'<td>{cell}</td>' for cell in row])
        # آخر صف = صف المجموع
        row_class = 'total-row' if i == len(rows) - 1 and ('مجموع' in str(row) or 'المجموع' in str(row)) else ''
        rows_html += f'<tr class="{row_class}">{cells}</tr>'
    
    title_html = f'<div class="table-title">{title}</div>' if title else ''
    
    return f'''
    <div class="table-container">
        {title_html}
        <table>
            {header_html}
            <tbody>{rows_html}</tbody>
        </table>
    </div>
    '''


def generate_item_html_legacy(item, draft) -> str:
    """الطريقة القديمة لتوليد HTML (بدون ItemComponent)."""
    if not draft:
        return ''
    
    if not draft.content and not draft.table_data and not draft.chart_config:
        return ''
    
    components_html = ''
    
    # 1. النص التحليلي
    if draft.content:
        components_html += f'''
        <div class="item-text">
            {format_text_content(draft.content)}
        </div>
        '''
    
    # 2. الرسم البياني
    if draft.chart_config:
        chart_html = generate_chart_html(draft.chart_config, item.code)
        if chart_html:
            components_html += chart_html
    
    # 3. الجدول
    if draft.table_data:
        table_html = generate_table_html(draft.table_data, item.code)
        if table_html:
            components_html += table_html
    
    # 4. المحتوى اليدوي
    if draft.manual_content:
        manual_html = generate_manual_content_html(draft.manual_content)
        if manual_html:
            components_html += manual_html
    
    if not components_html:
        return ''
    
    return f'''
    <article class="item" id="item-{item.code}">
        <h3 class="item-title">{item.code}: {item.name}</h3>
        {components_html}
    </article>
    '''


def build_chart_config_from_ref(chart_def, draft) -> Optional[Dict]:
    """بناء chart_config من تعريف الرسم."""
    if not chart_def:
        return None
    
    config = {
        'type': chart_def.chart_type,
        'title': chart_def.name,
    }
    
    # إذا في chart_config من المسودة، استخدم بياناته
    if draft and draft.chart_config:
        config['data'] = draft.chart_config.get('data', [])
        config['labels'] = draft.chart_config.get('labels', [])
        config['colors'] = draft.chart_config.get('colors', ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'])
    
    # دمج إعدادات تعريف الرسم
    if chart_def.config:
        config.update(chart_def.config)
    
    return config


def build_table_from_ref(table_def, draft, item_code: str) -> str:
    """بناء جدول HTML من تعريف الجدول."""
    if not table_def:
        return ''
    
    # استخدام بيانات المسودة إذا موجودة
    if draft and draft.table_data:
        return generate_table_html(draft.table_data, item_code, table_def.name)
    
    return ''


def format_text_content(content: str) -> str:
    """تنسيق النص (تحويل الفقرات وإزالة markers)."""
    import re
    
    # إزالة markers
    content = re.sub(r'\[CHART\]', '', content)
    content = re.sub(r'\[TABLE\]', '', content)
    content = re.sub(r'\[/TABLE\]', '', content)
    
    # إزالة JSON blocks (single line and multi-line)
    content = re.sub(r'```json\s*[\s\S]*?```', '', content)
    content = re.sub(r'\{"type":\s*"(bar|pie|line|gauge)"[^}]*\}', '', content)
    # إزالة JSON multi-line (all chart types)
    content = re.sub(r'\{\s*\n\s*"type":\s*"(bar|pie|line|gauge)"[\s\S]*?\n\s*\}', '', content)
    # إزالة JSON متعدد الأسطر مع indentation
    content = re.sub(r'```json[\s\S]*?```', '', content)
    content = re.sub(r'\{[\s\n]*"type":\s*"gauge"[\s\S]*?\}', '', content)
    
    # إزالة [IMAGE] blocks
    content = re.sub(r'\[IMAGE\][\s\S]*?\[/IMAGE\]', '', content)
    # إزالة [IMAGE] المنفردة
    content = re.sub(r'\[IMAGE\]', '', content)
    
    # إزالة [CHART] tags المتبقية
    content = re.sub(r'\[/?CHART\]', '', content)
    
    # إزالة أسطر فارغة متتالية
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    # إزالة markdown tables (سيُولّد من table_data)
    # صيغة: | header | header | \n |---|---| \n | data | data |
    content = re.sub(r'\|[^\n]+\|(\n\|[-:\s|]+\|)?(\n\|[^\n]+\|)*', '', content, flags=re.MULTILINE)
    
    # تحويل العناوين
    content = re.sub(r'^### (.+)$', r'<h4>\1</h4>', content, flags=re.MULTILINE)
    content = re.sub(r'^## (.+)$', r'<h3 class="content-h3">\1</h3>', content, flags=re.MULTILINE)
    content = re.sub(r'^# (.+)$', r'<h2 class="content-h2">\1</h2>', content, flags=re.MULTILINE)
    
    # تحويل الفقرات
    paragraphs = content.strip().split('\n\n')
    formatted = ''
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        # تجاهل الأسطر الفارغة والعناوين (تم تحويلها)
        if p.startswith('<h'):
            formatted += p + '\n'
        elif p.startswith('- ') or p.startswith('* '):
            # تحويل قوائم
            items = p.split('\n')
            formatted += '<ul>\n'
            for item in items:
                item_text = re.sub(r'^[-*]\s*', '', item.strip())
                if item_text:
                    formatted += f'  <li>{item_text}</li>\n'
            formatted += '</ul>\n'
        else:
            # فقرة عادية
            # تنسيق الأرقام بين قوسين
            p = re.sub(r'\((\d[\d,\.]*)\)', r'<strong>(\1)</strong>', p)
            formatted += f'<p>{p}</p>\n'
    
    return formatted


def generate_chart_html(chart_config: Dict, item_code: str) -> str:
    """توليد رسم بياني بـ CSS (بدون صور)."""
    chart_type = chart_config.get('type', 'pie')
    title = chart_config.get('title', '')
    
    # استخراج البيانات - دعم صيغتين مختلفتين
    raw_data = chart_config.get('data', [])
    
    if isinstance(raw_data, dict):
        # الصيغة الجديدة: {"labels": [...], "datasets": [{"data": [...]}]}
        labels = raw_data.get('labels', [])
        datasets = raw_data.get('datasets', [])
        if datasets:
            first_dataset = datasets[0]
            data = first_dataset.get('data', first_dataset.get('values', []))
            colors = []
            for ds in datasets:
                bg = ds.get('backgroundColor', ds.get('color'))
                if bg:
                    colors.append(bg)
        else:
            data = raw_data.get('values', [])
            colors = []
    else:
        # الصيغة القديمة: data = [1, 2, 3], labels = [...]
        data = raw_data
        labels = chart_config.get('labels', [])
        colors = chart_config.get('colors', [])
    
    # ألوان افتراضية
    default_colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
    if not colors:
        colors = default_colors
    
    # التأكد من وجود بيانات
    if not data:
        return ''
    
    if chart_type == 'pie':
        return generate_pie_chart_css(data, labels, colors, title, item_code)
    elif chart_type == 'bar':
        return generate_bar_chart_css(data, labels, colors, title, item_code)
    elif chart_type == 'line':
        return generate_line_chart_html(data, labels, colors, title, item_code)
    elif chart_type == 'gauge':
        return generate_gauge_chart_css(chart_config, title, item_code)
    
    return ''


def generate_pie_chart_css(data: List, labels: List, colors: List, title: str, item_code: str) -> str:
    """توليد رسم دائري بـ CSS conic-gradient."""
    if not data or len(data) < 2:
        return ''
    
    # حساب الزوايا
    total = sum(data)
    if total == 0:
        return ''
    
    percentages = [v / total * 100 for v in data]
    
    # بناء conic-gradient
    gradient_parts = []
    current_deg = 0
    for i, pct in enumerate(percentages):
        color = colors[i % len(colors)]
        end_deg = current_deg + (pct * 3.6)  # 360 / 100 = 3.6
        gradient_parts.append(f'{color} {current_deg}deg {end_deg}deg')
        current_deg = end_deg
    
    gradient = ', '.join(gradient_parts)
    
    # بناء legend
    legend_items = ''
    for i, (label, pct) in enumerate(zip(labels, percentages)):
        color = colors[i % len(colors)]
        legend_items += f'''
        <div class="legend-item">
            <span class="legend-color" style="background: {color};"></span>
            <span class="legend-label">{label} {pct:.1f}%</span>
        </div>
        '''
    
    return f'''
    <div class="chart-container">
        <div class="chart-title">{title}</div>
        <div class="pie-chart" style="background: conic-gradient({gradient});"></div>
        <div class="chart-legend">
            {legend_items}
        </div>
    </div>
    '''


def generate_bar_chart_css(data: List, labels: List, colors: List, title: str, item_code: str) -> str:
    """توليد رسم أعمدة بـ CSS."""
    if not data:
        return ''
    
    max_val = max(data) if data else 1
    
    bars_html = ''
    for i, (value, label) in enumerate(zip(data, labels)):
        color = colors[i % len(colors)]
        height_pct = (value / max_val * 100) if max_val > 0 else 0
        formatted_value = f'{value:,}'.replace(',', '،') if isinstance(value, (int, float)) else str(value)
        
        bars_html += f'''
        <div class="bar-group">
            <div class="bar-value">{formatted_value}</div>
            <div class="bar" style="height: {height_pct}%; background: {color};"></div>
            <div class="bar-label">{label}</div>
        </div>
        '''
    
    return f'''
    <div class="chart-container">
        <div class="chart-title">{title}</div>
        <div class="bar-chart">
            {bars_html}
        </div>
    </div>
    '''


def generate_line_chart_html(data: List, labels: List, colors: List, title: str, item_code: str) -> str:
    """توليد رسم خطي بـ SVG."""
    if not data or len(data) < 2:
        return ''
    
    width = 600
    height = 300
    padding = 50
    
    max_val = max(data)
    min_val = min(data)
    range_val = max_val - min_val if max_val != min_val else 1
    
    # حساب النقاط
    points = []
    step_x = (width - 2 * padding) / (len(data) - 1)
    for i, val in enumerate(data):
        x = padding + i * step_x
        y = height - padding - ((val - min_val) / range_val * (height - 2 * padding))
        points.append(f'{x},{y}')
    
    polyline_points = ' '.join(points)
    color = colors[0] if colors else '#3b82f6'
    
    # X-axis labels
    x_labels = ''
    for i, label in enumerate(labels):
        x = padding + i * step_x
        x_labels += f'<text x="{x}" y="{height - 20}" text-anchor="middle" class="axis-label">{label}</text>'
    
    return f'''
    <div class="chart-container">
        <div class="chart-title">{title}</div>
        <svg class="line-chart" viewBox="0 0 {width} {height}">
            <polyline points="{polyline_points}" fill="none" stroke="{color}" stroke-width="3"/>
            {x_labels}
        </svg>
    </div>
    '''


def generate_gauge_chart_css(chart_config: Dict, title: str, item_code: str) -> str:
    """توليد رسم gauge بـ CSS."""
    raw_data = chart_config.get('data', {})
    
    if isinstance(raw_data, dict):
        value = raw_data.get('value', 0)
        min_val = raw_data.get('min', 0)
        max_val = raw_data.get('max', 100)
        unit = raw_data.get('unit', '%')
    else:
        return ''
    
    # حساب النسبة
    if max_val > min_val:
        percentage = min(100, max(0, ((value - min_val) / (max_val - min_val)) * 100))
    else:
        percentage = 0
    
    # تحديد اللون بناءً على القيمة
    if percentage >= 70:
        color = '#27ae60'  # أخضر
    elif percentage >= 40:
        color = '#f39c12'  # برتقالي
    else:
        color = '#e74c3c'  # أحمر
    
    # تنسيق القيمة
    if isinstance(value, float):
        display_value = f'{value:.1f}'
    else:
        display_value = f'{value:,}'.replace(',', '،')
    
    return f'''
    <div class="chart-container gauge-container">
        <div class="chart-title">{title}</div>
        <div class="gauge">
            <div class="gauge-bar" style="width: {percentage}%; background: {color};"></div>
        </div>
        <div class="gauge-value">{display_value}{unit}</div>
    </div>
    '''


def generate_table_html(table_data: List[Dict], item_code: str, title: str = '') -> str:
    """توليد جدول HTML من البيانات."""
    if not table_data:
        return ''
    
    # استخراج الأعمدة من أول صف
    if isinstance(table_data, list) and len(table_data) > 0:
        if isinstance(table_data[0], dict):
            columns = list(table_data[0].keys())
        else:
            # list of lists
            columns = [f'العمود {i+1}' for i in range(len(table_data[0]))]
    else:
        return ''
    
    # بناء header
    header_cells = ''.join([f'<th>{col}</th>' for col in columns])
    header = f'<tr>{header_cells}</tr>'
    
    # بناء الصفوف
    rows_html = ''
    for i, row in enumerate(table_data):
        if isinstance(row, dict):
            cells = ''.join([f'<td>{format_cell_value(row.get(col, ""))}</td>' for col in columns])
        else:
            cells = ''.join([f'<td>{format_cell_value(cell)}</td>' for cell in row])
        
        row_class = 'total-row' if i == len(table_data) - 1 else ''
        rows_html += f'<tr class="{row_class}">{cells}</tr>'
    
    title_html = f'<div class="table-title">{title}</div>' if title else ''
    
    return f'''
    <div class="table-container">
        {title_html}
        <table>
            <thead>{header}</thead>
            <tbody>{rows_html}</tbody>
        </table>
    </div>
    '''


def format_cell_value(value) -> str:
    """تنسيق قيمة خلية."""
    if value is None or value == '':
        return '-'
    if isinstance(value, (int, float, Decimal)):
        return f'{value:,}'.replace(',', '،')
    return str(value)


def generate_manual_content_html(manual_content: List[Dict]) -> str:
    """توليد HTML للمحتوى اليدوي."""
    if not manual_content:
        return ''
    
    # التأكد من أن كل عنصر هو dict
    valid_items = [c for c in manual_content if isinstance(c, dict)]
    
    if not valid_items:
        return ''
    
    html = ''
    for item in sorted(valid_items, key=lambda x: x.get('order', 0)):
        item_type = item.get('type')
        
        if item_type == 'image':
            caption = item.get('caption', '')
            # TODO: resolve attachment URL
            url = item.get('url', '')
            if url:
                html += f'''
                <figure class="manual-image">
                    <img src="{url}" alt="{caption}">
                    <figcaption>{caption}</figcaption>
                </figure>
                '''
        
        elif item_type == 'text':
            content = item.get('content', '')
            if content:
                html += f'<div class="manual-text">{format_text_content(content)}</div>'
        
        elif item_type == 'table':
            data = item.get('data', [])
            title = item.get('title', '')
            if data:
                html += generate_table_html(data, '', title)
    
    return html


def get_report_css() -> str:
    """CSS للتقرير."""
    return '''
/* === Base === */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Cairo', 'Traditional Arabic', sans-serif;
    font-size: 16px;
    line-height: 1.8;
    color: #333;
    background: #fff;
    direction: rtl;
}

/* === Layout === */
.report-header {
    text-align: center;
    padding: 40px 20px;
    border-bottom: 3px solid #2563eb;
    margin-bottom: 40px;
}

.report-header h1 {
    font-size: 32px;
    color: #1a365d;
    margin-bottom: 10px;
}

.report-header .subtitle {
    font-size: 20px;
    color: #666;
}

.report-header .period {
    font-size: 18px;
    color: #2563eb;
    margin-top: 10px;
}

.report-content {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 20px;
}

/* === Axis === */
.axis {
    margin-bottom: 50px;
    page-break-inside: avoid;
}

.axis-title {
    font-size: 24px;
    color: #1a365d;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 10px;
    margin-bottom: 30px;
}

/* === Item === */
.item {
    margin-bottom: 40px;
    padding: 20px;
    background: #f8fafc;
    border-radius: 8px;
    page-break-inside: avoid;
}

.item-title {
    font-size: 20px;
    color: #2563eb;
    margin-bottom: 15px;
}

.item-text p {
    text-align: justify;
    margin-bottom: 15px;
}

.item-text strong {
    color: #1a365d;
}

/* === Tables === */
.table-container {
    margin: 25px 0;
    overflow-x: auto;
}

.table-title {
    font-weight: 700;
    text-align: center;
    margin-bottom: 15px;
    color: #1a365d;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

th, td {
    border: 1px solid #333;
    padding: 10px;
    text-align: center;
}

th {
    background: #2563eb;
    color: white;
    font-weight: 600;
}

tr:nth-child(even) {
    background: #f0f4f8;
}

tr.total-row {
    background: #1a365d !important;
    color: white;
    font-weight: bold;
}

/* === Charts === */
.chart-container {
    margin: 30px 0;
    text-align: center;
}

.chart-title {
    font-weight: 700;
    font-size: 18px;
    color: #1a365d;
    margin-bottom: 20px;
}

/* Pie Chart */
.pie-chart {
    width: 280px;
    height: 280px;
    border-radius: 50%;
    margin: 0 auto 20px;
    position: relative;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.pie-chart::before {
    content: '';
    position: absolute;
    width: 100px;
    height: 100px;
    background: white;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.chart-legend {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 20px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.legend-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
}

.legend-label {
    font-size: 14px;
    font-weight: 600;
}

/* Bar Chart */
.bar-chart {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 20px;
    height: 250px;
    padding: 20px;
    background: #f8fafc;
    border-radius: 8px;
}

.bar-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    max-width: 80px;
}

.bar {
    width: 100%;
    min-height: 10px;
    border-radius: 4px 4px 0 0;
    transition: height 0.3s;
}

.bar-value {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 5px;
}

.bar-label {
    font-size: 11px;
    text-align: center;
    margin-top: 8px;
    color: #666;
}

/* Line Chart */
.line-chart {
    width: 100%;
    max-width: 600px;
    height: auto;
}

.axis-label {
    font-size: 12px;
    fill: #666;
}

/* === Manual Content === */
.manual-image {
    margin: 20px 0;
    text-align: center;
}

.manual-image img {
    max-width: 100%;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.manual-image figcaption {
    margin-top: 10px;
    font-size: 14px;
    color: #666;
}

.manual-text {
    margin: 20px 0;
}

/* === Footer === */
.report-footer {
    text-align: center;
    padding: 40px 20px;
    margin-top: 50px;
    border-top: 1px solid #e5e7eb;
    color: #666;
    font-size: 14px;
}

/* === Gauge Chart === */
.gauge-container {
    padding: 20px;
}

.gauge {
    width: 100%;
    max-width: 400px;
    height: 30px;
    background: #e5e7eb;
    border-radius: 15px;
    margin: 0 auto;
    overflow: hidden;
}

.gauge-bar {
    height: 100%;
    border-radius: 15px;
    transition: width 0.5s ease;
}

.gauge-value {
    font-size: 24px;
    font-weight: 700;
    color: #1a365d;
    margin-top: 15px;
}

/* === Print === */
@media print {
    body {
        font-size: 12pt;
    }
    
    .report-header {
        padding: 20px;
    }
    
    .item {
        page-break-inside: avoid;
    }
    
    .pie-chart,
    .bar,
    tr.total-row,
    th {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}
'''


def generate_single_item_html(item, period) -> str:
    """توليد HTML لبند واحد فقط (للمعاينة)."""
    item_html = generate_item_html(item, period)
    
    if not item_html:
        return '<p>لا توجد بيانات لهذا البند</p>'
    
    css = get_report_css()
    
    return f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <style>{css}</style>
</head>
<body>
    <div class="report-content">
        {item_html}
    </div>
</body>
</html>'''
