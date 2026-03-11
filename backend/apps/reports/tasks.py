"""
Report generation tasks (Celery).
"""

from celery import shared_task
from django.utils import timezone

from .models import Report, ReportSection
from apps.ai_engine.services import generate_section_content, generate_with_cli


@shared_task
def generate_report(report_id: int, model: str = "cli"):
    """
    Generate all sections of a report using AI.
    
    Args:
        report_id: Report ID
        model: AI model to use ("cli", "claude", or "gemini")
    """
    try:
        report = Report.objects.get(id=report_id)
    except Report.DoesNotExist:
        return {'error': 'Report not found'}
    
    report.status = 'generating'
    report.save()
    
    sections = report.sections.all().order_by('order')
    total = sections.count()
    completed = 0
    
    for section in sections:
        # Generate content for this section
        result = generate_section_for_report(
            section_id=section.id,
            model=model
        )
        
        if result.get('success'):
            completed += 1
        
        # Update progress
        report.refresh_from_db()
    
    # Update report status
    report.status = 'review'
    report.generated_at = timezone.now()
    report.save()
    
    return {
        'success': True,
        'report_id': report_id,
        'sections_generated': completed,
        'total_sections': total
    }


@shared_task
def generate_section_for_report(section_id: int, model: str = "cli", custom_prompt: str = None):
    """
    Generate content for a single section.
    
    Args:
        section_id: Section ID
        model: AI model to use
        custom_prompt: Optional custom prompt
    """
    try:
        section = ReportSection.objects.get(id=section_id)
    except ReportSection.DoesNotExist:
        return {'error': 'Section not found'}
    
    section.status = 'generating'
    section.save()
    
    # Build prompt from template section
    template_section = section.template_section
    
    if custom_prompt:
        prompt = custom_prompt
    elif template_section and template_section.ai_prompt:
        prompt = template_section.ai_prompt
    else:
        prompt = f"اكتب قسم '{section.title}' للتقرير."
    
    # Get report period for context
    report = section.report
    period = f"{report.period_start} - {report.period_end}"
    
    # Add context to prompt
    full_prompt = f"""
اكتب قسم "{section.title}" للتقرير السنوي.

الفترة: {period}
المؤسسة: {report.organization.name if report.organization else 'جامعة البترا'}

{prompt}

البيانات المتاحة:
{section.data if section.data else 'لا توجد بيانات محددة'}
"""
    
    # Generate using AI
    result = generate_section_content(
        section_title=section.title,
        ai_prompt=full_prompt,
        data=section.data or {},
        word_count=template_section.target_word_count if template_section else 500,
        period=period,
        model=model
    )
    
    if result['success']:
        section.content = result['content']
        section.status = 'generated'
        section.generated_at = timezone.now()
        section.ai_tokens_used = result.get('total_tokens', 0)
        section.ai_cost = result.get('cost', 0)
        section.save()
        
        return {
            'success': True,
            'section_id': section_id,
            'content_length': len(result['content']),
            'tokens': result.get('total_tokens', 0),
            'cost': result.get('cost', 0)
        }
    else:
        section.status = 'failed'
        section.save()
        
        return {
            'success': False,
            'section_id': section_id,
            'error': result.get('error', 'Unknown error')
        }


@shared_task
def regenerate_section(section_id: int, style: str = "formal", model: str = "cli"):
    """
    Regenerate a section with different style.
    
    Args:
        section_id: Section ID
        style: Writing style ("formal", "brief", "detailed")
        model: AI model to use
    """
    try:
        section = ReportSection.objects.get(id=section_id)
    except ReportSection.DoesNotExist:
        return {'error': 'Section not found'}
    
    style_prompts = {
        'formal': 'اكتب بأسلوب رسمي أكاديمي.',
        'brief': 'اكتب بأسلوب مختصر وموجز.',
        'detailed': 'اكتب بأسلوب تفصيلي شامل.'
    }
    
    style_prompt = style_prompts.get(style, style_prompts['formal'])
    
    custom_prompt = f"""
{section.content}

---
أعد كتابة النص أعلاه:
{style_prompt}
احتفظ بجميع الأرقام والمعلومات.
"""
    
    return generate_section_for_report(
        section_id=section_id,
        model=model,
        custom_prompt=custom_prompt
    )
