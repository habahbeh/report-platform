#!/usr/bin/env python
"""
تحميل قالب التقرير السنوي لجامعة البترا

هذا السكربت:
1. يحذف جميع القوالب القديمة
2. يحمّل قالب البترا الكامل من الـ fixture
3. ينشئ مؤسسة جامعة البترا
4. ينشئ مستخدم admin

الاستخدام:
    python load_petra_template.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationMember
from apps.templates_app.models import (
    Template, Axis, Item, Entity, 
    TableDefinition, ChartDefinition, TemplateSection
)
from apps.reports.models import Report, ReportSection, Project

User = get_user_model()


def clear_old_data():
    """حذف جميع البيانات القديمة"""
    print("🗑️  حذف البيانات القديمة...")
    
    # حذف التقارير والمشاريع
    Report.objects.all().delete()
    Project.objects.all().delete()
    print("   ✅ تم حذف التقارير والمشاريع")
    
    # حذف الأقسام القديمة (TemplateSection)
    TemplateSection.objects.all().delete()
    print("   ✅ تم حذف أقسام القوالب القديمة")
    
    # حذف القوالب (سيحذف Axis, Item, Entity, TableDefinition, ChartDefinition تلقائياً)
    Template.objects.all().delete()
    print("   ✅ تم حذف القوالب القديمة")
    
    print("")


def load_fixture():
    """تحميل fixture قالب البترا"""
    print("📥 تحميل قالب البترا...")
    
    fixture_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'fixtures',
        'petra_template.json'
    )
    
    if not os.path.exists(fixture_path):
        print(f"   ❌ الملف غير موجود: {fixture_path}")
        return False
    
    call_command('loaddata', fixture_path)
    print("   ✅ تم تحميل القالب بنجاح")
    print("")
    return True


def create_organization():
    """إنشاء مؤسسة جامعة البترا"""
    print("🏛️  إنشاء مؤسسة جامعة البترا...")
    
    org, created = Organization.objects.get_or_create(
        name='جامعة البترا',
        defaults={
            'name_en': 'University of Petra',
            'settings': {
                'primary_color': '#1a365d',
                'secondary_color': '#2c5282',
                'logo_text': 'UOP'
            }
        }
    )
    
    if created:
        print("   ✅ تم إنشاء المؤسسة")
    else:
        print("   ℹ️  المؤسسة موجودة مسبقاً")
    
    # ربط القالب بالمؤسسة (اختياري - القالب عام)
    template = Template.objects.first()
    if template and not template.organization:
        # نبقي القالب عام (is_public=True) لكن نربطه كمثال
        print(f"   ℹ️  القالب '{template.name}' عام ومتاح لجميع المؤسسات")
    
    print("")
    return org


def create_admin_user(org):
    """إنشاء مستخدم admin"""
    print("👤 إنشاء مستخدم الإدارة...")
    
    admin, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@uop.edu.jo',
            'is_staff': True,
            'is_superuser': True,
            'name_ar': 'مدير النظام',
        }
    )
    
    if created:
        admin.set_password('admin123')
        admin.save()
        print("   ✅ تم إنشاء المستخدم admin")
    else:
        print("   ℹ️  المستخدم موجود مسبقاً")
    
    # إضافة المستخدم للمؤسسة
    membership, created = OrganizationMember.objects.get_or_create(
        organization=org,
        user=admin,
        defaults={'role': 'admin'}
    )
    
    print("")
    return admin


def print_summary():
    """طباعة ملخص البيانات المحملة"""
    print("=" * 50)
    print("📊 ملخص البيانات المحملة:")
    print("=" * 50)
    
    template = Template.objects.first()
    if template:
        print(f"\n📋 القالب: {template.name}")
        print(f"   - الفئة: {template.get_category_display()}")
        print(f"   - الإصدار: {template.version}")
        print(f"   - عام: {'نعم' if template.is_public else 'لا'}")
        
        axes_count = Axis.objects.filter(template=template).count()
        items_count = Item.objects.filter(axis__template=template).count()
        entities_count = Entity.objects.filter(template=template).count()
        tables_count = TableDefinition.objects.filter(template=template).count()
        charts_count = ChartDefinition.objects.filter(template=template).count()
        
        print(f"\n📈 المحتويات:")
        print(f"   - المحاور: {axes_count}")
        print(f"   - البنود (KPIs): {items_count}")
        print(f"   - الجهات: {entities_count}")
        print(f"   - الجداول: {tables_count}")
        print(f"   - الرسوم البيانية: {charts_count}")
        
        print(f"\n📁 المحاور بالتفصيل:")
        for axis in Axis.objects.filter(template=template).order_by('order'):
            items = Item.objects.filter(axis=axis).count()
            tables = TableDefinition.objects.filter(axis=axis).count()
            charts = ChartDefinition.objects.filter(axis=axis).count()
            print(f"   {axis.code}. {axis.name}")
            print(f"      └─ {items} بند | {tables} جدول | {charts} شكل")
    
    orgs_count = Organization.objects.count()
    users_count = User.objects.count()
    
    print(f"\n🏢 المؤسسات: {orgs_count}")
    print(f"👥 المستخدمون: {users_count}")
    
    print("\n" + "=" * 50)
    print("✨ تم التحميل بنجاح!")
    print("=" * 50)
    
    print("\n🔐 بيانات الدخول:")
    print("   المستخدم: admin")
    print("   كلمة المرور: admin123")
    
    print("\n🔗 الروابط:")
    print("   Backend: http://localhost:8001")
    print("   Admin: http://localhost:8001/admin/")
    print("   Frontend: http://localhost:3000")
    print("")


def main():
    print("\n" + "=" * 50)
    print("🚀 تحميل قالب التقرير السنوي — جامعة البترا")
    print("=" * 50 + "\n")
    
    # 1. حذف البيانات القديمة
    clear_old_data()
    
    # 2. تحميل الـ fixture
    if not load_fixture():
        print("❌ فشل تحميل القالب!")
        return
    
    # 3. إنشاء المؤسسة
    org = create_organization()
    
    # 4. إنشاء مستخدم admin
    create_admin_user(org)
    
    # 5. طباعة الملخص
    print_summary()


if __name__ == '__main__':
    main()
