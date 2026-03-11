"""
Organization serializers.
"""

from rest_framework import serializers
from .models import Organization, OrganizationMember


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'name_en', 'logo', 'settings', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class OrganizationMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.display_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = OrganizationMember
        fields = ['id', 'user', 'user_name', 'user_email', 'role', 'created_at']
        read_only_fields = ['created_at']
