"""
Organization views.
"""

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Organization, OrganizationMember
from .serializers import OrganizationSerializer, OrganizationMemberSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """API for organizations"""
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.AllowAny]  # For demo
    
    def get_queryset(self):
        """Return all organizations (demo mode)"""
        return Organization.objects.all()
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """List organization members"""
        org = self.get_object()
        members = org.members.all()
        serializer = OrganizationMemberSerializer(members, many=True)
        return Response(serializer.data)
