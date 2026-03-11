"""
Account serializers for authentication and user management.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer."""
    display_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'name_ar', 'display_name', 'avatar', 'phone', 'language',
            'notifications_enabled', 'is_staff', 'is_active',
            'date_joined', 'last_activity'
        ]
        read_only_fields = ['id', 'date_joined', 'last_activity', 'is_staff']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'name_ar', 'phone'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'كلمات المرور غير متطابقة'})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('بيانات الدخول غير صحيحة')
            if not user.is_active:
                raise serializers.ValidationError('الحساب غير مفعّل')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('يرجى إدخال اسم المستخدم وكلمة المرور')
        
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'كلمات المرور الجديدة غير متطابقة'})
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('كلمة المرور الحالية غير صحيحة')
        return value


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for profile update."""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'name_ar', 'email',
            'phone', 'avatar', 'language', 'notifications_enabled'
        ]
