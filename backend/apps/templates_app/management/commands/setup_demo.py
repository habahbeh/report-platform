"""
Setup demo data for the platform.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization
from apps.templates_app.models import Template, TemplateSection
from apps.reports.models import Report, ReportSection
from datetime import date

User = get_user_model()


class Command(BaseCommand):
    help = 'Setup demo data including default template and sample report'
    
    def handle(self, *args, **options):
        self.stdout.write('Setting up demo data...')
        
        # Create demo user
        user, created = User.objects.get_or_create(
            username='demo',
            defaults={
                'email': 'demo@example.com',
                'name_ar': 'مستخدم تجريبي',
                'is_staff': True,
            }
        )
        if created:
            user.set_password('demo1234')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created demo user: demo / demo1234'))
        
        # Create organization
        org, created = Organization.objects.get_or_create(
            name='جامعة البترا',
            defaults={
                'name_en': 'University of Petra',
                'settings': {
                    'primary_color': '#1a365d',
                    'secondary_color': '#c53030',
                }
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created organization: {org.name}'))
        
        # Create default template
        template, created = Template.objects.get_or_create(
            name='التقرير السنوي الجامعي',
            organization=org,
            defaults={
                'description': 'قالب التقرير السنوي الشامل للجامعة',
                'is_default': True,
                'is_active': True,
                'created_by': user,
                'structure': {},
                'settings': {
                    'word_count_default': 500,
                    'include_charts': True,
                    'include_images': True,
                }
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created template: {template.name}'))
            
            # Create sections
            sections_data = [
                {
                    'title': 'المقدمة',
                    'title_en': 'Introduction',
                    'order': 1,
                    'section_type': 'text',
                    'ai_prompt': '''اكتب مقدمة للتقرير السنوي تتضمن:
- نبذة موجزة عن الجامعة ورؤيتها ورسالتها
- إشارة للعام الأكاديمي وأهم المحطات
- تمهيد لمحتوى التقرير''',
                    'settings': {'word_count': 350},
                },
                {
                    'title': 'المعيار الثالث: البحث العلمي والابتكار',
                    'title_en': 'Research and Innovation',
                    'order': 2,
                    'section_type': 'mixed',
                    'ai_prompt': '''اكتب قسم البحث العلمي والابتكار بناءً على البيانات المتوفرة.
تضمن:
1. فقرة افتتاحية تلخص الإنجازات البحثية
2. تحليل المنشورات والاقتباسات
3. المشاريع البحثية الممولة
4. براءات الاختراع والجوائز
5. خاتمة موجزة''',
                    'settings': {'word_count': 700, 'include_chart': True},
                },
                {
                    'title': 'المعيار الرابع: الموارد البشرية والمالية',
                    'title_en': 'Human Resources and Finance',
                    'order': 3,
                    'section_type': 'mixed',
                    'ai_prompt': '''اكتب قسم الموارد البشرية والمالية.
تضمن:
1. إحصائيات الكادر الأكاديمي والإداري
2. التوزيع حسب الرتب والمؤهلات
3. برامج التطوير المهني
4. الموازنة والإنفاق''',
                    'settings': {'word_count': 600, 'include_table': True},
                },
                {
                    'title': 'المعيار الخامس: البيئة الجامعية',
                    'title_en': 'University Environment',
                    'order': 4,
                    'section_type': 'mixed',
                    'ai_prompt': '''اكتب قسم البيئة الجامعية.
تضمن:
1. المرافق والبنية التحتية
2. التحول الرقمي
3. خدمات الطلاب
4. الأنشطة اللامنهجية''',
                    'settings': {'word_count': 500, 'include_images': True},
                },
                {
                    'title': 'المعيار السادس: خدمة المجتمع',
                    'title_en': 'Community Service',
                    'order': 5,
                    'section_type': 'mixed',
                    'ai_prompt': '''اكتب قسم خدمة المجتمع.
تضمن:
1. البرامج والمبادرات المجتمعية
2. الشراكات مع القطاع العام والخاص
3. التطوع والعمل الخيري
4. أثر الجامعة على المجتمع المحلي''',
                    'settings': {'word_count': 500, 'include_images': True},
                },
                {
                    'title': 'الخاتمة والتوصيات',
                    'title_en': 'Conclusion',
                    'order': 6,
                    'section_type': 'text',
                    'ai_prompt': '''اكتب خاتمة للتقرير السنوي.
تضمن:
- ملخص لأبرز الإنجازات
- الدروس المستفادة
- التحديات والفرص
- الرؤية المستقبلية''',
                    'settings': {'word_count': 350},
                },
            ]
            
            for section_data in sections_data:
                TemplateSection.objects.create(
                    template=template,
                    **section_data
                )
            
            self.stdout.write(self.style.SUCCESS(f'Created {len(sections_data)} sections'))
        
        # Create sample report
        report, created = Report.objects.get_or_create(
            title='التقرير السنوي 2023-2024',
            organization=org,
            defaults={
                'template': template,
                'period_start': date(2023, 9, 1),
                'period_end': date(2024, 8, 31),
                'status': 'draft',
                'created_by': user,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created report: {report.title}'))
            
            # Create report sections from template
            for ts in template.sections.all():
                ReportSection.objects.create(
                    report=report,
                    template_section=ts,
                    title=ts.title,
                    order=ts.order,
                    status='pending',
                    data={},
                )
            
            self.stdout.write(self.style.SUCCESS(f'Created report sections'))
        
        self.stdout.write(self.style.SUCCESS('Demo data setup complete!'))
        self.stdout.write('')
        self.stdout.write('Login credentials:')
        self.stdout.write('  Username: demo')
        self.stdout.write('  Password: demo1234')
