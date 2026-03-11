#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
استيراد بيانات Demo من data_complete إلى المنصة
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

import pandas as pd
from pathlib import Path
from apps.data_collection.models import DataCollectionPeriod, DataFile, EntitySubmission
from apps.reports.models import ItemDraft
from apps.templates_app.models import Entity, Item

DATA_PATH = Path("/Users/mohammadhabahbeh/Desktop/report yearly/platform/need/data_complete")

# Mapping: folder name → Entity name (partial match)
ENTITY_MAPPING = {
    "وحدة_ضمان_الجودة": "ضمان الجودة",
    "عمادة_القبول_والتسجيل": "القبول والتسجيل",
    "عمادة_البحث_العلمي": "البحث العلمي",
    "عمادة_شؤون_الطلبة": "شؤون الطلبة",
    "مكتب_التعاون_الدولي": "العلاقات الدولية",
    "الدائرة_المالية": "المالية",
    "المكتبة": "المكتبة",
    "عمادة_الدراسات_العليا": "الدراسات العليا",
    "مركز_الحاسوب": "الحاسوب",
}

# Mapping: file name → Item code (partial match)
ITEM_MAPPING = {
    "البرامج_المعتمدة": "1.1",  # عدد البرامج التي حصلت على الاعتماد
    "البرامج_المستحدثة": "1.4",  # عدد البرامج المستحدثة
    "الطلبة_حسب_الجنسية": "1.8",  # عدد الطلبة غير الأردنيين
    "الزيادة_والنقص_هيئة_تدريسية": "2.1",  # إجمالي النقص في أعضاء هيئة التدريس
    "استبانة_رضا_التدريسيين": "2.3",  # رضا أعضاء الهيئة التدريسية
    "استبانة_رضا_الطلبة": "2.4",  # رضا الطلبة
    "الموفدون": "2.5",  # عدد الطلبة الموفدين
    "المنتهية_ايفادهم": "2.6",  # عدد المنتهية إيفادهم
    "الابحاث_المنشورة": "3.1",  # عدد الأبحاث المنشورة
    "المشاركة_بمؤتمرات": "3.2",  # عدد المشاركات بمؤتمرات
    "براءات_الاختراع": "3.3",  # عدد براءات الاختراع
    "الجوائز_البحثية": "3.4",  # عدد الجوائز البحثية
    "موازنة_البحث_العلمي": "3.5",  # موازنة البحث العلمي
    "المشاريع_البحثية": "3.6",  # عدد المشاريع البحثية
    "الخريجون": "4.1",  # عدد الخريجين
    "الاتفاقيات_الدولية": "5.1",  # عدد الاتفاقيات الدولية
    "برامج_التبادل": "5.2",  # برامج التبادل الطلابي
    "الانشطة_الطلابية": "6.1",  # الأنشطة الطلابية
    "الاندية_الطلابية": "6.2",  # عدد الأندية الطلابية
    "مشاريع_خدمة_المجتمع": "7.1",  # مشاريع خدمة المجتمع
}


def find_entity(folder_name):
    """البحث عن الجهة المناسبة"""
    # Clean folder name
    clean_name = folder_name.split('_', 1)[-1] if '_' in folder_name else folder_name
    
    # Try exact mapping first
    for key, value in ENTITY_MAPPING.items():
        if key in folder_name:
            entities = Entity.objects.filter(name__icontains=value)
            if entities.exists():
                return entities.first()
    
    # Try partial match
    for entity in Entity.objects.all():
        if clean_name in entity.name or entity.name in clean_name:
            return entity
    
    return None


def find_item(file_name):
    """البحث عن البند المناسب"""
    clean_name = file_name.replace('.xlsx', '')
    
    # Try mapping first
    if clean_name in ITEM_MAPPING:
        code = ITEM_MAPPING[clean_name]
        items = Item.objects.filter(code=code)
        if items.exists():
            return items.first()
    
    # Try partial match on item name
    for item in Item.objects.all():
        if clean_name in item.name or item.name in clean_name:
            return item
    
    return None


def extract_value(df, file_name):
    """استخراج القيمة من DataFrame"""
    # Default: count rows
    value = len(df)
    
    # For specific files, calculate differently
    if "موازنة" in file_name or "ايراد" in file_name or "مصروفات" in file_name:
        # Sum numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            value = df[numeric_cols[-1]].sum()  # Last numeric column usually is total
    
    elif "استبانة" in file_name or "رضا" in file_name:
        # Average for satisfaction surveys
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            value = round(df[numeric_cols[-1]].mean(), 2)
    
    return value


def import_data():
    """استيراد البيانات"""
    # Get period
    period = DataCollectionPeriod.objects.first()
    if not period:
        print("❌ لا توجد فترة جمع!")
        return
    
    print(f"📅 فترة الجمع: {period.name}")
    print(f"📂 مسار البيانات: {DATA_PATH}")
    print("-" * 50)
    
    stats = {
        'files_processed': 0,
        'files_skipped': 0,
        'items_updated': 0,
        'entities_found': set(),
    }
    
    # Process each entity folder
    for folder in sorted(DATA_PATH.iterdir()):
        if not folder.is_dir():
            continue
        
        entity = find_entity(folder.name)
        if entity:
            print(f"\n📁 {folder.name} → {entity.name}")
            stats['entities_found'].add(entity.name)
        else:
            print(f"\n📁 {folder.name} → ⚠️ لم يتم العثور على جهة")
            continue
        
        # Get or create submission
        submission, _ = EntitySubmission.objects.get_or_create(
            period=period,
            entity=entity,
            defaults={'status': 'submitted', 'progress': 100}
        )
        
        # Process each Excel file
        for excel_file in folder.glob("*.xlsx"):
            try:
                df = pd.read_excel(excel_file)
                if df.empty:
                    stats['files_skipped'] += 1
                    continue
                
                value = extract_value(df, excel_file.name)
                item = find_item(excel_file.name)
                
                print(f"  📄 {excel_file.name}: {len(df)} صفوف → قيمة: {value}", end="")
                
                if item:
                    # Update ItemDraft
                    draft, created = ItemDraft.objects.get_or_create(
                        period=period,
                        item=item,
                        defaults={'status': 'not_started'}
                    )
                    draft.current_value = value
                    draft.save(update_fields=['current_value', 'updated_at'])
                    print(f" ✅ {item.code}")
                    stats['items_updated'] += 1
                else:
                    print(" (لا يوجد بند مطابق)")
                
                # Save as DataFile
                DataFile.objects.get_or_create(
                    period=period,
                    entity=entity,
                    item=item,
                    filename=excel_file.name,
                    defaults={
                        'status': 'approved',
                        'file_type': 'xlsx',
                    }
                )
                
                stats['files_processed'] += 1
                
            except Exception as e:
                print(f"  ❌ خطأ في {excel_file.name}: {e}")
                stats['files_skipped'] += 1
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 ملخص الاستيراد:")
    print(f"  ملفات تمت معالجتها: {stats['files_processed']}")
    print(f"  ملفات تم تخطيها: {stats['files_skipped']}")
    print(f"  بنود تم تحديثها: {stats['items_updated']}")
    print(f"  جهات تم العثور عليها: {len(stats['entities_found'])}")


if __name__ == '__main__':
    import_data()
