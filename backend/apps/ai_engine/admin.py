"""
AI Engine admin.
"""

from django.contrib import admin
from .models import AIGeneration, Prompt, DocumentChunk


@admin.register(AIGeneration)
class AIGenerationAdmin(admin.ModelAdmin):
    list_display = ['section', 'model', 'total_tokens', 'cost', 'success', 'generated_at']
    list_filter = ['model', 'success', 'generated_at']
    search_fields = ['section__title', 'prompt']
    readonly_fields = ['generated_at']


@admin.register(Prompt)
class PromptAdmin(admin.ModelAdmin):
    list_display = ['name', 'prompt_type', 'organization', 'is_default', 'is_active']
    list_filter = ['prompt_type', 'is_default', 'is_active']
    search_fields = ['name', 'content']


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ['source_type', 'source_id', 'chunk_index', 'created_at']
    list_filter = ['source_type', 'organization']
    search_fields = ['text']
