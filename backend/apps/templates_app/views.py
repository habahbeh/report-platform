"""
Template views.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Template, Axis, Item, Entity, ItemComponent, TableDefinition, ChartDefinition, TemplateSection
from .serializers import (
    TemplateSerializer, TemplateDetailSerializer, TemplateCreateSerializer,
    AxisSerializer, AxisDetailSerializer,
    ItemSerializer, ItemDetailSerializer, ItemWithComponentsSerializer,
    ItemComponentSerializer,
    EntitySerializer, EntityDetailSerializer,
    TableDefinitionSerializer, ChartDefinitionSerializer,
    TemplateSectionSerializer
)


class TemplateViewSet(viewsets.ModelViewSet):
    """API for templates"""
    permission_classes = [permissions.AllowAny]  # For demo
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TemplateDetailSerializer
        if self.action == 'create':
            return TemplateCreateSerializer
        return TemplateSerializer
    
    def get_queryset(self):
        queryset = Template.objects.filter(is_active=True)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by organization
        org_id = self.request.query_params.get('organization')
        if org_id:
            queryset = queryset.filter(organization_id=org_id)
        
        # Filter public templates
        is_public = self.request.query_params.get('is_public')
        if is_public:
            queryset = queryset.filter(is_public=is_public.lower() == 'true')
        
        return queryset.select_related('organization')
    
    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a template"""
        template = self.get_object()
        new_name = request.data.get('name', None)
        new_org_id = request.data.get('organization_id', None)
        
        from apps.organizations.models import Organization
        new_org = None
        if new_org_id:
            try:
                new_org = Organization.objects.get(id=new_org_id)
            except Organization.DoesNotExist:
                pass
        
        new_template = template.duplicate(new_name, new_org)
        serializer = TemplateSerializer(new_template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def axes(self, request, pk=None):
        """List template axes with items"""
        template = self.get_object()
        axes = template.axes.all().prefetch_related('items')
        serializer = AxisDetailSerializer(axes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """List all items in template"""
        template = self.get_object()
        items = Item.objects.filter(axis__template=template).order_by('axis__order', 'order')
        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def entities(self, request, pk=None):
        """List template entities"""
        template = self.get_object()
        entities = template.entities.all()
        serializer = EntityDetailSerializer(entities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def tables(self, request, pk=None):
        """List template table definitions"""
        template = self.get_object()
        tables = template.table_definitions.all()
        serializer = TableDefinitionSerializer(tables, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def charts(self, request, pk=None):
        """List template chart definitions"""
        template = self.get_object()
        charts = template.chart_definitions.all()
        serializer = ChartDefinitionSerializer(charts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def full(self, request, pk=None):
        """Get full template with all related data"""
        template = self.get_object()
        serializer = TemplateDetailSerializer(template)
        return Response(serializer.data)


class AxisViewSet(viewsets.ModelViewSet):
    """API for Axes"""
    serializer_class = AxisSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Axis.objects.all()
        
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        
        return queryset.select_related('template')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AxisDetailSerializer
        return AxisSerializer
    
    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """List items in this axis"""
        axis = self.get_object()
        items = axis.items.all()
        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)


class ItemViewSet(viewsets.ModelViewSet):
    """API for Items (KPIs)"""
    serializer_class = ItemSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Item.objects.all()
        
        axis_id = self.request.query_params.get('axis')
        if axis_id:
            queryset = queryset.filter(axis_id=axis_id)
        
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(axis__template_id=template_id)
        
        field_type = self.request.query_params.get('field_type')
        if field_type:
            queryset = queryset.filter(field_type=field_type)
        
        return queryset.select_related('axis', 'axis__template')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ItemDetailSerializer
        return ItemSerializer


class EntityViewSet(viewsets.ModelViewSet):
    """API for Entities"""
    serializer_class = EntitySerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Entity.objects.all()
        
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        is_college = self.request.query_params.get('is_college')
        if is_college:
            queryset = queryset.filter(is_college=is_college.lower() == 'true')
        
        return queryset.select_related('template')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EntityDetailSerializer
        return EntitySerializer
    
    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """List items this entity is responsible for"""
        entity = self.get_object()
        items = entity.items.all()
        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)


class TableDefinitionViewSet(viewsets.ModelViewSet):
    """API for Table Definitions"""
    serializer_class = TableDefinitionSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = TableDefinition.objects.all()
        
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        
        table_type = self.request.query_params.get('table_type')
        if table_type:
            queryset = queryset.filter(table_type=table_type)
        
        return queryset.select_related('template', 'axis', 'entity')


class ChartDefinitionViewSet(viewsets.ModelViewSet):
    """API for Chart Definitions"""
    serializer_class = ChartDefinitionSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = ChartDefinition.objects.all()
        
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        
        return queryset.select_related('template', 'axis')


# Legacy
class TemplateSectionViewSet(viewsets.ModelViewSet):
    """API for TemplateSection (Legacy)"""
    serializer_class = TemplateSectionSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return TemplateSection.objects.all()


class ItemComponentViewSet(viewsets.ModelViewSet):
    """API for ItemComponent — مكونات البند"""
    serializer_class = ItemComponentSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = ItemComponent.objects.all()
        
        # Filter by item
        item_id = self.request.query_params.get('item')
        if item_id:
            queryset = queryset.filter(item_id=item_id)
        
        return queryset.select_related('item', 'chart_ref', 'table_ref').order_by('order')
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """إعادة ترتيب المكونات"""
        item_id = request.data.get('item_id')
        order_list = request.data.get('order', [])  # [id1, id2, id3...]
        
        if not item_id or not order_list:
            return Response({'error': 'item_id و order مطلوبان'}, status=400)
        
        for idx, comp_id in enumerate(order_list):
            ItemComponent.objects.filter(id=comp_id, item_id=item_id).update(order=idx + 1)
        
        return Response({'success': True, 'message': f'تم ترتيب {len(order_list)} مكون'})
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """إنشاء مكونات متعددة دفعة واحدة"""
        item_id = request.data.get('item_id')
        components = request.data.get('components', [])
        
        if not item_id:
            return Response({'error': 'item_id مطلوب'}, status=400)
        
        created = []
        for idx, comp_data in enumerate(components):
            comp_data['item'] = item_id
            comp_data['order'] = idx + 1
            serializer = ItemComponentSerializer(data=comp_data)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
        
        return Response({
            'success': True,
            'created': len(created),
            'components': created
        })
