"""
Export views for generating Word and PDF documents.
"""

from django.http import FileResponse, HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.reports.models import Report
from .services import export_to_word, export_to_pdf, get_export_filename


@api_view(['POST'])
@permission_classes([AllowAny])
def export_report_view(request, report_id):
    """
    Export a report to Word or PDF.
    
    Body:
        format: 'docx' or 'pdf'
    """
    try:
        report = Report.objects.get(id=report_id)
    except Report.DoesNotExist:
        return Response(
            {'error': 'التقرير غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    format_type = request.data.get('format', 'docx')
    
    if format_type == 'docx':
        buffer = export_to_word(report)
        content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    elif format_type == 'pdf':
        buffer = export_to_pdf(report)
        if buffer is None:
            return Response(
                {'error': 'PDF export not available. Install WeasyPrint.'},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )
        content_type = 'application/pdf'
    else:
        return Response(
            {'error': 'صيغة غير مدعومة. استخدم docx أو pdf'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    filename = get_export_filename(report, format_type)
    
    response = HttpResponse(
        buffer.getvalue(),
        content_type=content_type
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_report_view(request, report_id):
    """
    Preview report as HTML.
    """
    try:
        report = Report.objects.get(id=report_id)
    except Report.DoesNotExist:
        return Response(
            {'error': 'التقرير غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from .services import generate_report_html
    html_content = generate_report_html(report)
    
    return HttpResponse(html_content, content_type='text/html; charset=utf-8')


# ============================================
# New HTML Generation Views (DataCollectionPeriod)
# ============================================

@api_view(['GET'])
@permission_classes([AllowAny])
def generate_period_html_view(request, period_id):
    """
    توليد تقرير HTML كامل من فترة جمع البيانات.
    
    Query params:
        download: 1 لتحميل الملف، 0 للعرض في المتصفح
    """
    from apps.data_collection.models import DataCollectionPeriod
    from .html_generator import generate_full_report_html
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return Response(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    html_content = generate_full_report_html(period)
    
    download = request.query_params.get('download', '0') == '1'
    
    response = HttpResponse(html_content, content_type='text/html; charset=utf-8')
    
    if download:
        filename = f'report_{period.academic_year.replace("/", "-")}.html'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_item_html_view(request, period_id, item_id):
    """
    معاينة بند واحد كـ HTML.
    """
    from apps.data_collection.models import DataCollectionPeriod
    from apps.templates_app.models import Item
    from .html_generator import generate_single_item_html
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
        item = Item.objects.get(id=item_id)
    except (DataCollectionPeriod.DoesNotExist, Item.DoesNotExist):
        return Response(
            {'error': 'البيانات غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    html_content = generate_single_item_html(item, period)
    
    return HttpResponse(html_content, content_type='text/html; charset=utf-8')
