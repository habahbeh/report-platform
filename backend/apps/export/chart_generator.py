"""
Chart Generator - Generate chart images from chart_config JSON
"""

import io
import matplotlib
matplotlib.use('Agg')  # Non-GUI backend

import matplotlib.pyplot as plt
from matplotlib import font_manager
import arabic_reshaper
from bidi.algorithm import get_display


def setup_arabic_font():
    """Setup Arabic font for matplotlib."""
    # Try to find Arabic font
    arabic_fonts = ['Arial', 'Tahoma', 'DejaVu Sans', 'Noto Sans Arabic']
    
    for font_name in arabic_fonts:
        try:
            font_manager.findfont(font_name)
            plt.rcParams['font.family'] = font_name
            return font_name
        except:
            continue
    
    return None


def reshape_arabic(text):
    """Reshape Arabic text for proper display."""
    if not text:
        return text
    try:
        reshaped = arabic_reshaper.reshape(str(text))
        return get_display(reshaped)
    except:
        return str(text)


def generate_chart_image(chart_config: dict, width: int = 8, height: int = 5) -> io.BytesIO:
    """
    Generate chart image from chart_config JSON.
    
    Args:
        chart_config: {
            "type": "bar" | "pie" | "line",
            "title": "عنوان الرسم",
            "data": {
                "labels": ["أ", "ب", "ج"],
                "datasets": [
                    {"label": "البيانات", "data": [10, 20, 30], "values": [10, 20, 30]}
                ]
            }
        }
    
    Returns:
        BytesIO containing PNG image
    """
    setup_arabic_font()
    
    chart_type = chart_config.get('type', 'bar')
    title = chart_config.get('title', '')
    data = chart_config.get('data', {})
    
    # Handle case where data is empty list
    if not data or data == []:
        note = chart_config.get('note', 'لا تتوفر بيانات')
        return generate_placeholder_chart(title, note)
    
    # Handle case where data is not a dict
    if not isinstance(data, dict):
        note = chart_config.get('note', 'لا تتوفر بيانات')
        return generate_placeholder_chart(title, note)
    
    # Extract labels and values
    labels = data.get('labels', [])
    datasets = data.get('datasets', [])
    
    if not datasets:
        return None
    
    # Get values from first dataset
    first_dataset = datasets[0]
    values = first_dataset.get('values') or first_dataset.get('data', [])
    dataset_label = first_dataset.get('label', '')
    
    if not values or not labels:
        # Try to create simple chart from chart_config directly
        if 'note' in chart_config:
            return generate_placeholder_chart(title, chart_config.get('note', ''))
        return None
    
    # Create figure
    fig, ax = plt.subplots(figsize=(width, height))
    
    # Reshape Arabic text
    display_labels = [reshape_arabic(str(l)) for l in labels]
    display_title = reshape_arabic(title)
    display_dataset_label = reshape_arabic(dataset_label)
    
    # Colors
    colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    
    if chart_type == 'bar':
        bars = ax.bar(display_labels, values, color=colors[:len(values)])
        
        # Add value labels on bars
        for bar, val in zip(bars, values):
            height = bar.get_height()
            ax.annotate(f'{val}',
                       xy=(bar.get_x() + bar.get_width() / 2, height),
                       xytext=(0, 3),
                       textcoords="offset points",
                       ha='center', va='bottom',
                       fontsize=12, fontweight='bold')
        
        ax.set_ylabel(display_dataset_label)
        
    elif chart_type == 'pie':
        ax.pie(values, labels=display_labels, autopct='%1.1f%%',
               colors=colors[:len(values)], startangle=90)
        ax.axis('equal')
        
    elif chart_type == 'line':
        ax.plot(display_labels, values, marker='o', linewidth=2,
                markersize=8, color=colors[0])
        
        # Add value labels
        for i, (x, y) in enumerate(zip(display_labels, values)):
            ax.annotate(f'{y}', (x, y), textcoords="offset points",
                       xytext=(0, 10), ha='center', fontsize=10)
        
        ax.set_ylabel(display_dataset_label)
        ax.grid(True, alpha=0.3)
    
    # Title
    if display_title:
        ax.set_title(display_title, fontsize=14, fontweight='bold', pad=20)
    
    # Style
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    plt.tight_layout()
    
    # Save to BytesIO
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)
    buffer.seek(0)
    
    return buffer


def generate_placeholder_chart(title: str, note: str) -> io.BytesIO:
    """Generate a placeholder chart with a note."""
    setup_arabic_font()
    
    fig, ax = plt.subplots(figsize=(8, 4))
    
    display_title = reshape_arabic(title)
    display_note = reshape_arabic(note)
    
    ax.text(0.5, 0.6, display_title, 
            ha='center', va='center', fontsize=14, fontweight='bold',
            transform=ax.transAxes)
    
    ax.text(0.5, 0.4, display_note,
            ha='center', va='center', fontsize=11, color='gray',
            transform=ax.transAxes, wrap=True)
    
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    
    # Add border
    for spine in ax.spines.values():
        spine.set_visible(True)
        spine.set_color('#ddd')
    
    plt.tight_layout()
    
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight',
                facecolor='#f8f9fa', edgecolor='none')
    plt.close(fig)
    buffer.seek(0)
    
    return buffer


def generate_simple_bar(title: str, label: str, value: float) -> io.BytesIO:
    """Generate a simple single-bar chart."""
    return generate_chart_image({
        'type': 'bar',
        'title': title,
        'data': {
            'labels': [label],
            'datasets': [{'label': '', 'values': [value]}]
        }
    })
