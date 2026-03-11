"""
Accounts admin.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'name_ar', 'is_staff', 'last_activity']
    search_fields = ['username', 'email', 'name_ar', 'first_name', 'last_name']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('معلومات إضافية', {
            'fields': ('name_ar', 'avatar', 'phone', 'language', 'notifications_enabled', 'last_activity')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('معلومات إضافية', {
            'fields': ('name_ar', 'email')
        }),
    )
