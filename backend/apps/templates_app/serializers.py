"""
Serializers for Templates app.
"""

from rest_framework import serializers
from .models import (
    Template, Axis, Item, Entity, ItemComponent,
    TableDefinition, ChartDefinition, TemplateSection
)


class ItemSerializer(serializers.ModelSerializer):
    """Serializer for Item (KPI)"""
    entities = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True
    )
    
    class Meta:
        model = Item
        fields = [
            'id', 'axis', 'code', 'name', 'name_en', 'description',
            'field_type', 'config', 'formula', 'dependencies',
            'aggregation', 'required', 'unit', 'order',
            'ai_prompt', 'notes', 'entities'
        ]


class ItemDetailSerializer(ItemSerializer):
    """Detailed serializer with entity names"""
    entities = serializers.SerializerMethodField()
    
    def get_entities(self, obj):
        return [
            {'id': e.id, 'name': e.name}
            for e in obj.entities.all()
        ]


class ItemComponentSerializer(serializers.ModelSerializer):
    """Serializer for ItemComponent — مكونات البند"""
    chart_ref_name = serializers.CharField(source='chart_ref.name', read_only=True, allow_null=True)
    table_ref_name = serializers.CharField(source='table_ref.name', read_only=True, allow_null=True)
    
    class Meta:
        model = ItemComponent
        fields = [
            'id', 'item', 'order', 'component_type', 'source',
            'title', 'config', 'notes',
            'chart_ref', 'chart_ref_name',
            'table_ref', 'table_ref_name',
            'required'
        ]


class ItemWithComponentsSerializer(ItemSerializer):
    """Item مع مكوناته"""
    components = ItemComponentSerializer(many=True, read_only=True)
    components_count = serializers.SerializerMethodField()
    
    class Meta(ItemSerializer.Meta):
        fields = ItemSerializer.Meta.fields + ['components', 'components_count']
    
    def get_components_count(self, obj):
        return obj.components.count()


class AxisSerializer(serializers.ModelSerializer):
    """Serializer for Axis"""
    items_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Axis
        fields = [
            'id', 'template', 'code', 'name', 'name_en',
            'description', 'order', 'ai_prompt', 'items_count'
        ]


class AxisDetailSerializer(AxisSerializer):
    """Detailed serializer with items"""
    items = ItemSerializer(many=True, read_only=True)
    
    class Meta(AxisSerializer.Meta):
        fields = AxisSerializer.Meta.fields + ['items']


class EntitySerializer(serializers.ModelSerializer):
    """Serializer for Entity"""
    items_count = serializers.ReadOnlyField()
    items = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Item.objects.all(),
        required=False
    )
    
    class Meta:
        model = Entity
        fields = [
            'id', 'template', 'name', 'name_en', 'contact_role',
            'priority', 'is_college', 'notes', 'items', 'items_count'
        ]


class EntityDetailSerializer(EntitySerializer):
    """Detailed serializer with item details"""
    items = ItemSerializer(many=True, read_only=True)


class TableDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for TableDefinition"""
    
    class Meta:
        model = TableDefinition
        fields = [
            'id', 'template', 'axis', 'code', 'name', 'name_en',
            'table_type', 'columns', 'fixed_rows', 'levels',
            'template_file', 'entity', 'order', 'notes'
        ]


class ChartDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for ChartDefinition"""
    
    class Meta:
        model = ChartDefinition
        fields = [
            'id', 'template', 'axis', 'code', 'name', 'name_en',
            'chart_type', 'data_source', 'config', 'order'
        ]


class TemplateSerializer(serializers.ModelSerializer):
    """Basic Template serializer"""
    axes_count = serializers.ReadOnlyField()
    items_count = serializers.ReadOnlyField()
    entities_count = serializers.ReadOnlyField()
    tables_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Template
        fields = [
            'id', 'name', 'name_en', 'description', 'category',
            'organization', 'is_public', 'is_default', 'is_active',
            'version', 'axes_count', 'items_count', 'entities_count',
            'tables_count', 'created_at', 'updated_at'
        ]


class TemplateDetailSerializer(TemplateSerializer):
    """Detailed Template serializer with all related data"""
    axes = AxisDetailSerializer(many=True, read_only=True)
    entities = EntitySerializer(many=True, read_only=True)
    table_definitions = TableDefinitionSerializer(many=True, read_only=True)
    chart_definitions = ChartDefinitionSerializer(many=True, read_only=True)
    
    class Meta(TemplateSerializer.Meta):
        fields = TemplateSerializer.Meta.fields + [
            'export_settings', 'axes', 'entities',
            'table_definitions', 'chart_definitions'
        ]


class TemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating templates"""
    
    class Meta:
        model = Template
        fields = [
            'name', 'name_en', 'description', 'category',
            'organization', 'is_public', 'export_settings'
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


# ============================================
# Legacy serializers
# ============================================

class TemplateSectionSerializer(serializers.ModelSerializer):
    """Legacy TemplateSection serializer"""
    
    class Meta:
        model = TemplateSection
        fields = [
            'id', 'template', 'title', 'title_en', 'order',
            'section_type', 'data_source', 'ai_prompt', 'settings'
        ]
