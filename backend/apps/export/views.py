"""
Export API Views - Generate reports via API
"""

import os
from pathlib import Path
from django.http import FileResponse, JsonResponse
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.templates_app.models import Item
from apps.reports.models import Project, ItemStructure
from .report_generator import ReportGenerator
from .full_report_generator import FullReportGenerator


class GenerateItemReportView(APIView):
    """
    Generate report for a specific item.
    
    POST /api/export/generate/
    {
        "item_code": "3.1",
        "format": "all",  // html, docx, pdf, all
        "project_id": "uuid"  // optional
    }
    """
    
    def post(self, request):
        item_code = request.data.get('item_code')
        output_format = request.data.get('format', 'all')
        project_id = request.data.get('project_id')
        
        if not item_code:
            return Response(
                {'error': 'item_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find item
        items = Item.objects.filter(code=item_code)
        if not items.exists():
            items = Item.objects.filter(code__contains=item_code)
        
        if not items.exists():
            return Response(
                {'error': f'Item {item_code} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        item = items.first()
        
        # Find project
        if project_id:
            try:
                from uuid import UUID
                project = Project.objects.get(id=UUID(project_id))
            except:
                return Response(
                    {'error': 'Project not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            project = Project.objects.filter(status='active').first()
            if not project:
                project = Project.objects.first()
        
        if not project:
            return Response(
                {'error': 'No project found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Find item structure
        item_structure = ItemStructure.objects.filter(
            item=item,
            project=project
        ).first()
        
        if not item_structure:
            item_structure = ItemStructure.objects.filter(item=item).first()
        
        if not item_structure:
            return Response(
                {'error': f'No structure found for item {item_code}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate
        output_dir = Path(settings.MEDIA_ROOT) / 'generated' / str(project.id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        generator = ReportGenerator(
            project=project,
            output_dir=str(output_dir)
        )
        
        try:
            results = generator.generate_item(
                item_structure=item_structure,
                formats=output_format
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Build response with download URLs
        base_url = request.build_absolute_uri('/media/generated/')
        downloads = {}
        
        for fmt, path in results.items():
            if path and os.path.exists(path):
                filename = os.path.basename(path)
                downloads[fmt] = {
                    'url': f"{base_url}{project.id}/{filename}",
                    'filename': filename,
                    'size': os.path.getsize(path)
                }
        
        return Response({
            'success': True,
            'item': {
                'code': item.code,
                'name': item.name
            },
            'project': {
                'id': str(project.id),
                'name': project.name
            },
            'downloads': downloads
        })


class DownloadReportView(APIView):
    """
    Download a generated report file.
    
    GET /api/export/download/<project_id>/<filename>/
    """
    
    def get(self, request, project_id, filename):
        file_path = Path(settings.MEDIA_ROOT) / 'generated' / project_id / filename
        
        if not file_path.exists():
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Determine content type
        ext = file_path.suffix.lower()
        content_types = {
            '.html': 'text/html',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.pdf': 'application/pdf',
            '.png': 'image/png',
        }
        content_type = content_types.get(ext, 'application/octet-stream')
        
        response = FileResponse(
            open(file_path, 'rb'),
            content_type=content_type
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response


class ListItemsView(APIView):
    """
    List available items for report generation.
    
    GET /api/export/items/
    """
    
    def get(self, request):
        project_id = request.query_params.get('project_id')
        
        if project_id:
            # Get items that have structures for this project
            item_ids = ItemStructure.objects.filter(
                project_id=project_id
            ).values_list('item_id', flat=True)
            items = Item.objects.filter(id__in=item_ids)
        else:
            # Get all items with any structure
            item_ids = ItemStructure.objects.values_list('item_id', flat=True).distinct()
            items = Item.objects.filter(id__in=item_ids)
        
        return Response({
            'items': [
                {
                    'id': str(item.id),
                    'code': item.code,
                    'name': item.name,
                    'axis': item.axis.name if item.axis else None
                }
                for item in items.order_by('code')
            ]
        })


class GenerateFullReportView(APIView):
    """
    Generate complete annual report as single Word document.
    
    POST /api/export/generate-full/
    {
        "project_id": "uuid"  // optional
    }
    
    Returns: Download URL for complete report
    """
    
    def post(self, request):
        project_id = request.data.get('project_id')
        
        # Find project
        if project_id:
            try:
                from uuid import UUID
                project = Project.objects.get(id=UUID(project_id))
            except:
                return Response(
                    {'error': 'Project not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            project = Project.objects.filter(status='active').first()
            if not project:
                project = Project.objects.first()
        
        if not project:
            return Response(
                {'error': 'No project found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate full report
        output_dir = Path(settings.MEDIA_ROOT) / 'generated' / str(project.id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        generator = FullReportGenerator(
            project=project,
            output_dir=str(output_dir)
        )
        
        output_format = request.data.get('format', 'all')
        
        try:
            results = generator.generate(formats=output_format)
            stats = generator.get_stats()
        except Exception as e:
            import traceback
            return Response(
                {'error': str(e), 'traceback': traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Build response with download URLs
        base_url = request.build_absolute_uri('/media/generated/')
        downloads = {}
        
        for fmt, path in results.items():
            if path and os.path.exists(path):
                filename = os.path.basename(path)
                downloads[fmt] = {
                    'url': f"{base_url}{project.id}/{filename}",
                    'filename': filename,
                    'size': os.path.getsize(path)
                }
        
        return Response({
            'success': True,
            'message': 'تم توليد التقرير الكامل بنجاح',
            'project': {
                'id': str(project.id),
                'name': project.name
            },
            'stats': stats,
            'downloads': downloads
        })
