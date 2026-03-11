"""
Account URLs.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('users', views.UserViewSet, basename='users')

urlpatterns = [
    # Authentication
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # Profile
    path('me/', views.me_view, name='me'),
    path('profile/', views.update_profile_view, name='profile'),
    path('change-password/', views.change_password_view, name='change-password'),
    
    # Admin user management
    path('', include(router.urls)),
]
