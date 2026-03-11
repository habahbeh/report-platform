"""
Organization models.
"""

from django.db import models
from django.conf import settings as django_settings


class Organization(models.Model):
    """المؤسسة"""
    name = models.CharField('الاسم', max_length=255)
    name_en = models.CharField('الاسم بالإنجليزية', max_length=255, blank=True)
    logo = models.ImageField('الشعار', upload_to='logos/', blank=True)
    settings = models.JSONField('الإعدادات', default=dict, blank=True)
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'مؤسسة'
        verbose_name_plural = 'المؤسسات'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class OrganizationMember(models.Model):
    """عضوية في المؤسسة"""
    ROLE_CHOICES = [
        ('admin', 'مدير'),
        ('editor', 'محرر'),
        ('viewer', 'مشاهد'),
        ('contributor', 'مساهم'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name='المؤسسة'
    )
    user = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='organization_memberships',
        verbose_name='المستخدم'
    )
    role = models.CharField('الدور', max_length=20, choices=ROLE_CHOICES, default='viewer')
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    
    class Meta:
        verbose_name = 'عضوية'
        verbose_name_plural = 'العضويات'
        unique_together = ['organization', 'user']
    
    def __str__(self):
        return f"{self.user} - {self.organization} ({self.get_role_display()})"
