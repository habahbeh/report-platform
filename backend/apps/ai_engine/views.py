"""
AI Engine views.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .services import (
    generate_section_content,
    generate_introduction,
    generate_research_section,
    generate_conclusion
)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_test(request):
    """Test AI generation endpoint."""
    
    section_type = request.data.get('section_type', 'introduction')
    model = request.data.get('model', 'cli')  # Default to CLI (free with Pro!)
    
    if section_type == 'introduction':
        result = generate_introduction(
            organization_name="جامعة البترا",
            period="2023-2024",
            highlights=[
                "423 منشور علمي في Scopus",
                "افتتاح مركز الابتكار",
                "اعتماد 3 برامج أكاديمية جديدة"
            ],
            model=model
        )
    elif section_type == 'research':
        result = generate_research_section(
            publications_count=423,
            citations_count=1250,
            h_index=28,
            funded_projects=12,
            patents=3,
            by_faculty={
                "كلية الهندسة": 89,
                "كلية تكنولوجيا المعلومات": 76,
                "كلية الصيدلة": 68,
                "كلية العلوم": 54,
                "كلية الآداب": 42,
            },
            period="2023-2024",
            model=model
        )
    elif section_type == 'conclusion':
        result = generate_conclusion(
            key_achievements=[
                "تصنيف متقدم في QS العالمي",
                "زيادة المنشورات بنسبة 15%",
                "توسيع الشراكات الدولية"
            ],
            challenges=[
                "التحول الرقمي المتسارع",
                "المنافسة الإقليمية"
            ],
            future_plans=[
                "تطوير برامج الدراسات العليا",
                "تعزيز البحث العلمي التطبيقي"
            ],
            period="2023-2024",
            model=model
        )
    else:
        return Response(
            {'error': 'Invalid section_type'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_custom(request):
    """Generate custom content based on prompt and data."""
    
    prompt = request.data.get('prompt', '')
    data = request.data.get('data', {})
    title = request.data.get('section_title', request.data.get('title', 'قسم مخصص'))
    word_count = request.data.get('word_count', 500)
    model = request.data.get('model', 'gemini')  # Default to Gemini (free!)
    
    if not prompt:
        return Response(
            {'error': 'Prompt is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    result = generate_section_content(
        section_title=title,
        ai_prompt=prompt,
        data=data,
        word_count=word_count,
        period=data.get('period', '2023-2024'),
        model=model
    )
    
    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_intro_view(request):
    """Generate introduction section."""
    model = request.data.get('model', 'gemini')
    
    result = generate_introduction(
        organization_name=request.data.get('organization_name', 'جامعة البترا'),
        period=request.data.get('period', '2023-2024'),
        highlights=request.data.get('highlights', []),
        model=model
    )
    
    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_research_view(request):
    """Generate research section."""
    model = request.data.get('model', 'gemini')
    
    result = generate_research_section(
        publications_count=request.data.get('publications_count', 0),
        citations_count=request.data.get('citations_count', 0),
        h_index=request.data.get('h_index', 0),
        funded_projects=request.data.get('funded_projects', 0),
        patents=request.data.get('patents', 0),
        by_faculty=request.data.get('by_faculty'),
        period=request.data.get('period', '2023-2024'),
        model=model
    )
    
    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_conclusion_view(request):
    """Generate conclusion section."""
    model = request.data.get('model', 'gemini')
    
    result = generate_conclusion(
        key_achievements=request.data.get('key_achievements', []),
        challenges=request.data.get('challenges', []),
        future_plans=request.data.get('future_plans', []),
        period=request.data.get('period', '2023-2024'),
        model=model
    )
    
    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_report_section(request, section_id):
    """Generate content for a specific report section."""
    from apps.reports.models import ReportSection
    from django.utils import timezone
    
    try:
        section = ReportSection.objects.get(id=section_id)
    except ReportSection.DoesNotExist:
        return Response({'error': 'القسم غير موجود'}, status=404)
    
    model = request.data.get('model', 'cli')
    custom_prompt = request.data.get('prompt', '')
    
    # Update status
    section.status = 'generating'
    section.save()
    
    # Build prompt
    report = section.report
    period = f"{report.period_start} - {report.period_end}"
    
    if custom_prompt:
        prompt = custom_prompt
    elif section.template_section and section.template_section.ai_prompt:
        prompt = section.template_section.ai_prompt
    else:
        prompt = f"اكتب محتوى تفصيلي لقسم '{section.title}'"
    
    # Generate
    result = generate_section_content(
        section_title=section.title,
        ai_prompt=prompt,
        data=section.data or {},
        word_count=500,
        period=period,
        model=model
    )
    
    if result['success']:
        section.content = result['content']
        section.status = 'generated'
        section.generated_at = timezone.now()
        section.save()
    else:
        section.status = 'failed'
        section.save()
    
    return Response({
        'success': result['success'],
        'section_id': section.id,
        'title': section.title,
        'content': result.get('content', ''),
        'error': result.get('error'),
        'cost': result.get('cost', 0),
        'model': result.get('model', model),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_full_report(request, report_id):
    """Generate all sections of a report."""
    from apps.reports.models import Report
    from django.utils import timezone
    
    try:
        report = Report.objects.get(id=report_id)
    except Report.DoesNotExist:
        return Response({'error': 'التقرير غير موجود'}, status=404)
    
    model = request.data.get('model', 'cli')
    
    report.status = 'generating'
    report.save()
    
    results = []
    for section in report.sections.order_by('order'):
        section.status = 'generating'
        section.save()
        
        # Build prompt
        period = f"{report.period_start} - {report.period_end}"
        
        if section.template_section and section.template_section.ai_prompt:
            prompt = section.template_section.ai_prompt
        else:
            prompt = f"اكتب محتوى تفصيلي لقسم '{section.title}'"
        
        # Generate
        result = generate_section_content(
            section_title=section.title,
            ai_prompt=prompt,
            data=section.data or {},
            word_count=500,
            period=period,
            model=model
        )
        
        if result['success']:
            section.content = result['content']
            section.status = 'generated'
            section.generated_at = timezone.now()
        else:
            section.status = 'failed'
        
        section.save()
        
        results.append({
            'section_id': section.id,
            'title': section.title,
            'success': result['success'],
            'error': result.get('error'),
        })
    
    report.status = 'review'
    report.generated_at = timezone.now()
    report.save()
    
    return Response({
        'success': True,
        'report_id': report.id,
        'sections': results,
    })
