"""
AI Engine models for tracking generations and embeddings.
"""

from django.db import models
from django.conf import settings as django_settings


class AIGeneration(models.Model):
    """سجل توليد بالذكاء الاصطناعي"""
    section = models.ForeignKey(
        'reports.ReportSection',
        on_delete=models.CASCADE,
        related_name='ai_generations',
        verbose_name='القسم'
    )
    
    # Input
    prompt = models.TextField('الـ Prompt')
    context = models.TextField('السياق', blank=True)
    
    # Output
    response = models.TextField('الرد')
    
    # Model info
    model = models.CharField('النموذج', max_length=100)
    
    # Usage
    input_tokens = models.IntegerField('الرموز المدخلة', default=0)
    output_tokens = models.IntegerField('الرموز المخرجة', default=0)
    total_tokens = models.IntegerField('إجمالي الرموز', default=0)
    
    # Cost
    cost = models.DecimalField('التكلفة', max_digits=10, decimal_places=6, default=0)
    
    # Timing
    duration_ms = models.IntegerField('المدة (مللي ثانية)', default=0)
    generated_at = models.DateTimeField('تاريخ التوليد', auto_now_add=True)
    
    # Status
    success = models.BooleanField('ناجح', default=True)
    error = models.TextField('الخطأ', blank=True)
    
    class Meta:
        verbose_name = 'توليد AI'
        verbose_name_plural = 'توليدات AI'
        ordering = ['-generated_at']
    
    def __str__(self):
        return f"توليد - {self.section.title} ({self.generated_at})"


class Prompt(models.Model):
    """قالب Prompt"""
    PROMPT_TYPES = [
        ('system', 'System Prompt'),
        ('section', 'Section Prompt'),
        ('summary', 'Summary Prompt'),
        ('chart', 'Chart Description'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='prompts',
        verbose_name='المؤسسة'
    )
    
    name = models.CharField('الاسم', max_length=255)
    prompt_type = models.CharField('النوع', max_length=20, choices=PROMPT_TYPES)
    content = models.TextField('المحتوى')
    
    # Variables that can be used in the prompt
    variables = models.JSONField('المتغيرات', default=list, blank=True)
    
    is_default = models.BooleanField('افتراضي', default=False)
    is_active = models.BooleanField('مفعّل', default=True)
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'قالب Prompt'
        verbose_name_plural = 'قوالب Prompt'
        ordering = ['prompt_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_prompt_type_display()})"


# Note: For pgvector, you would need to add the extension and use a custom field
# This is a placeholder that can be enhanced with actual vector support
class DocumentChunk(models.Model):
    """جزء من مستند للـ RAG"""
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='document_chunks',
        verbose_name='المؤسسة'
    )
    
    # Source document
    source_type = models.CharField('نوع المصدر', max_length=50)  # report, template, data_file
    source_id = models.IntegerField('معرّف المصدر')
    
    # Chunk info
    chunk_index = models.IntegerField('رقم الجزء')
    text = models.TextField('النص')
    
    # Embedding - store as JSON for now, can be migrated to pgvector
    # embedding = VectorField(dimensions=1536)  # For pgvector
    embedding = models.JSONField('التضمين', default=list, blank=True)
    
    # Metadata
    metadata = models.JSONField('البيانات الوصفية', default=dict, blank=True)
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    
    class Meta:
        verbose_name = 'جزء مستند'
        verbose_name_plural = 'أجزاء المستندات'
        ordering = ['source_type', 'source_id', 'chunk_index']
    
    def __str__(self):
        return f"{self.source_type}:{self.source_id} - Chunk {self.chunk_index}"
