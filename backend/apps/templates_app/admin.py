"""
Admin configuration for Templates app.
"""

from django.contrib import admin
from .models import (
    Template, Axis, Item, Entity, 
    TableDefinition, ChartDefinition, TemplateSection,
    ItemComponent
)


class AxisInline(admin.TabularInline):
    model = Axis
    extra = 0
    ordering = ['order']


class ItemInline(admin.TabularInline):
    model = Item
    extra = 0
    ordering = ['order']
    fields = ['code', 'name', 'field_type', 'required', 'order']


class ItemComponentInline(admin.TabularInline):
    model = ItemComponent
    extra = 1
    ordering = ['order']
    fields = ['order', 'component_type', 'source', 'table_ref', 'chart_ref', 'title', 'required']
    autocomplete_fields = ['table_ref', 'chart_ref']


class EntityInline(admin.TabularInline):
    model = Entity
    extra = 0
    fields = ['name', 'priority', 'is_college']


class TableDefinitionInline(admin.TabularInline):
    model = TableDefinition
    extra = 0
    fields = ['code', 'name', 'table_type', 'order']


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'organization', 'is_public', 'is_default', 'axes_count', 'items_count']
    list_filter = ['category', 'is_public', 'is_default', 'organization']
    search_fields = ['name', 'name_en', 'description']
    readonly_fields = ['created_at', 'updated_at', 'axes_count', 'items_count', 'entities_count']
    
    fieldsets = [
        ('المعلومات الأساسية', {
            'fields': ['name', 'name_en', 'description', 'category']
        }),
        ('الإعدادات', {
            'fields': ['organization', 'is_public', 'is_default', 'is_active', 'version']
        }),
        ('الإحصائيات', {
            'fields': ['axes_count', 'items_count', 'entities_count']
        }),
        ('التصدير', {
            'fields': ['export_settings'],
            'classes': ['collapse']
        }),
        ('البيانات الوصفية', {
            'fields': ['created_by', 'created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]
    
    inlines = [AxisInline, EntityInline, TableDefinitionInline]


@admin.register(Axis)
class AxisAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'template', 'items_count', 'order']
    list_filter = ['template']
    search_fields = ['name', 'name_en', 'code']
    ordering = ['template', 'order']
    
    inlines = [ItemInline]


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'axis', 'field_type', 'required', 'aggregation', 'components_count']
    list_filter = ['axis__template', 'field_type', 'required', 'aggregation']
    search_fields = ['name', 'name_en', 'code', 'description']
    ordering = ['axis__template', 'axis__order', 'order']
    
    fieldsets = [
        ('المعلومات الأساسية', {
            'fields': ['axis', 'code', 'name', 'name_en', 'description']
        }),
        ('نوع الحقل', {
            'fields': ['field_type', 'config', 'unit']
        }),
        ('الحساب', {
            'fields': ['formula', 'dependencies', 'aggregation']
        }),
        ('التحقق', {
            'fields': ['required']
        }),
        ('العرض', {
            'fields': ['order', 'ai_prompt', 'notes']
        }),
    ]
    
    inlines = [ItemComponentInline]
    
    def components_count(self, obj):
        return obj.components.count()
    components_count.short_description = 'المكوّنات'


@admin.register(Entity)
class EntityAdmin(admin.ModelAdmin):
    list_display = ['name', 'template', 'priority', 'is_college', 'items_count']
    list_filter = ['template', 'priority', 'is_college']
    search_fields = ['name', 'name_en', 'contact_role']  # مطلوب للـ autocomplete
    ordering = ['name']
    
    filter_horizontal = ['items']


@admin.register(TableDefinition)
class TableDefinitionAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'template', 'table_type', 'entity']
    list_filter = ['template', 'table_type']
    search_fields = ['name', 'name_en', 'code']  # مطلوب للـ autocomplete


@admin.register(ChartDefinition)
class ChartDefinitionAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'template', 'chart_type', 'axis']
    list_filter = ['template', 'chart_type']
    search_fields = ['name', 'name_en', 'code']  # مطلوب للـ autocomplete


@admin.register(ItemComponent)
class ItemComponentAdmin(admin.ModelAdmin):
    list_display = ['item', 'order', 'component_type', 'source', 'title', 'required']
    list_filter = ['component_type', 'source', 'required', 'item__axis__template']
    search_fields = ['item__code', 'item__name', 'title']
    ordering = ['item__axis__order', 'item__order', 'order']
    autocomplete_fields = ['item', 'table_ref', 'chart_ref']
    
    fieldsets = [
        ('الربط', {
            'fields': ['item', 'order']
        }),
        ('نوع المكوّن', {
            'fields': ['component_type', 'source']
        }),
        ('المراجع', {
            'fields': ['table_ref', 'chart_ref'],
            'classes': ['collapse']
        }),
        ('الإعدادات', {
            'fields': ['title', 'config', 'required', 'notes']
        }),
    ]


# Legacy
@admin.register(TemplateSection)
class TemplateSectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'template', 'section_type', 'order']
    list_filter = ['template', 'section_type']
    search_fields = ['title', 'title_en']
