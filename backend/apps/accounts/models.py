"""
Account models - extending Django's User model.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Custom User model"""
    
    # Arabic name
    name_ar = models.CharField('الاسم بالعربية', max_length=255, blank=True)
    
    # Profile
    avatar = models.ImageField('الصورة الشخصية', upload_to='avatars/', blank=True)
    phone = models.CharField('رقم الهاتف', max_length=20, blank=True)
    
    # Preferences
    language = models.CharField('اللغة', max_length=10, default='ar')
    notifications_enabled = models.BooleanField('تفعيل الإشعارات', default=True)
    
    # Metadata
    last_activity = models.DateTimeField('آخر نشاط', null=True, blank=True)
    
    class Meta:
        verbose_name = 'مستخدم'
        verbose_name_plural = 'المستخدمون'
    
    def __str__(self):
        return self.name_ar or self.get_full_name() or self.username
    
    @property
    def display_name(self):
        return self.name_ar or self.get_full_name() or self.username
