"""
Export serializers.
"""

from rest_framework import serializers
from .models import ExportJob


class ExportJobSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ExportJob
        fields = [
            'id', 'report', 'format', 'status', 'status_display',
            'output_file', 'error_message',
            'created_at', 'completed_at'
        ]
        read_only_fields = ['status', 'output_file', 'error_message', 'created_at', 'completed_at']
