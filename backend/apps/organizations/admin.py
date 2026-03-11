"""
Organization admin.
"""

from django.contrib import admin
from .models import Organization, OrganizationMember


class OrganizationMemberInline(admin.TabularInline):
    model = OrganizationMember
    extra = 1


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'name_en', 'created_at']
    search_fields = ['name', 'name_en']
    inlines = [OrganizationMemberInline]


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'organization', 'role', 'created_at']
    list_filter = ['role', 'organization']
    search_fields = ['user__username', 'user__email', 'organization__name']
