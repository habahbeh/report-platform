"""
Export models for tracking exported documents.
"""

from django.db import models
from django.conf import settings as django_settings


class ExportJob(models.Model):
    """مهمة تصدير"""
    FORMAT_CHOICES = [
        ('docx', 'Word'),
        ('pdf', 'PDF'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'قيد الانتظار'),
        ('processing', 'جاري المعالجة'),
        ('completed', 'مكتمل'),
        ('failed', 'فشل'),
    ]
    
    report = models.ForeignKey(
        'reports.Report',
        on_delete=models.CASCADE,
        related_name='export_jobs',
        verbose_name='التقرير'
    )
    
    format = models.CharField('الصيغة', max_length=10, choices=FORMAT_CHOICES)
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Output file
    file = models.FileField('الملف', upload_to='exports/', blank=True)
    file_size = models.IntegerField('حجم الملف', default=0)
    
    # Processing info
    progress = models.IntegerField('التقدم', default=0)  # 0-100
    error = models.TextField('الخطأ', blank=True)
    
    # Settings
    settings = models.JSONField('الإعدادات', default=dict, blank=True)
    
    # User and timing
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='أنشئ بواسطة'
    )
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    started_at = models.DateTimeField('بدء المعالجة', null=True, blank=True)
    completed_at = models.DateTimeField('انتهاء المعالجة', null=True, blank=True)
    
    class Meta:
        verbose_name = 'مهمة تصدير'
        verbose_name_plural = 'مهام التصدير'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"تصدير {self.report.title} ({self.get_format_display()})"
    
    @property
    def duration(self):
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


class ExportTemplate(models.Model):
    """قالب تصدير (Word template)"""
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='export_templates',
        verbose_name='المؤسسة'
    )
    
    name = models.CharField('الاسم', max_length=255)
    description = models.TextField('الوصف', blank=True)
    
    # Template file (Word document with placeholders)
    file = models.FileField('ملف القالب', upload_to='export_templates/')
    
    # Settings
    page_size = models.CharField('حجم الصفحة', max_length=20, default='A4')
    orientation = models.CharField('الاتجاه', max_length=20, default='portrait')
    margins = models.JSONField('الهوامش', default=dict, blank=True)
    
    is_default = models.BooleanField('افتراضي', default=False)
    is_active = models.BooleanField('مفعّل', default=True)
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'قالب تصدير'
        verbose_name_plural = 'قوالب التصدير'
        ordering = ['-is_default', 'name']
    
    def __str__(self):
        return self.name
