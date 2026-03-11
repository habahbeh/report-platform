#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
استيراد البيانات الكاملة من Excel إلى المنصة
- يحفظ الجداول كاملة (table_data) وليس فقط الأرقام
- يربط كل ملف بالبند المناسب
"""

import os
import sys
import json
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import pandas as pd
from pathlib import Path
from decimal import Decimal
from apps.data_collection.models import DataCollectionPeriod
from apps.reports.models import ItemDraft
from apps.templates_app.models import Item

DATA_PATH = Path("/Users/mohammadhabahbeh/Desktop/report yearly/platform/need/data_complete")

# ============================================
# الربط الشامل: ملف Excel → كود البند
# ============================================
FILE_TO_ITEM = {
    # المعيار الأول: الاعتمادية وضمان الجودة
    "البرامج_المعتمدة.xlsx": "1.1",
    "الاعتمادات_الأكاديمية.xlsx": "1.2",
    "شهادات_الجودة.xlsx": "1.3",
    "البرامج_المستحدثة.xlsx": "1.4",
    "التصنيفات_العالمية.xlsx": "1.5",  # QS
    "الطلبة_حسب_الجنسية.xlsx": "1.8",
    "الاتفاقيات_الدولية.xlsx": "1.10",
    "برامج_التبادل.xlsx": "1.10",
    
    # المعيار الثاني: التدريس
    "الزيادة_والنقص_هيئة_تدريسية.xlsx": "2.1",  # سيُقسم إلى 2.1 و 2.2
    "استبانة_رضا_التدريسيين.xlsx": "2.3",
    "استبانة_رضا_الطلبة.xlsx": "2.4",
    "الموفدون.xlsx": "2.5",
    "المنتهية_ايفادهم.xlsx": "2.5",
    "الدورات_التدريبية.xlsx": "2.6",
    "ورش_العمل.xlsx": "2.6",
    
    # المعيار الثالث: البحث العلمي
    "الابحاث_المنشورة.xlsx": "3.1",
    "المشاركة_بمؤتمرات.xlsx": "3.8",
    "براءات_الاختراع.xlsx": "3.3",
    "الجوائز_البحثية.xlsx": "3.3",
    "المشاريع_البحثية.xlsx": "3.6",
    "موازنة_البحث_العلمي.xlsx": "3.7",
    
    # المعيار الرابع: الموارد المالية
    "الايرادات_والمصروفات.xlsx": "4.1",
    "الموازنة.xlsx": "4.1",
    "الوحدات_الانتاجية.xlsx": "4.4",
    "الانشطة_الاستثمارية.xlsx": "4.5",
    "صندوق_نهاية_الخدمة.xlsx": "4.8",
    "التامين_الصحي.xlsx": "4.9",
    "المكافات_والعمل_الاضافي.xlsx": "4.10",
    "دورات_تدريب_الاداريين.xlsx": "4.11",
    "القروض.xlsx": "4.13",
    "الفوائد_البنكية.xlsx": "4.14",
    
    # المعيار الخامس: البنية التحتية
    "المباني_والانشاءات.xlsx": "5.1",
    "الصيانة.xlsx": "5.2",
    "الخدمات_المكتبية.xlsx": "5.3",
    "المختبرات.xlsx": "5.4",
    "نسبة_الحوسبة.xlsx": "5.5",
    "احصائيات_المكتبة.xlsx": "5.3",
    
    # المعيار السادس: خدمة المجتمع
    "مشاريع_خدمة_المجتمع.xlsx": "6.1",
    "الانشطة_التطوعية.xlsx": "6.3",
    "الانشطة_الطلابية.xlsx": "6.3",
    "الاندية_الطلابية.xlsx": "6.3",
    
    # الكليات - كل كلية ممكن يكون عندها ملفات متعددة
    "الانشطة_البحثية.xlsx": "3.1",
    "اعضاء_هيئة_التدريس.xlsx": "2.1",
    "اعضاء_الهيئة_التدريسية.xlsx": "2.1",
    "الطلبة_المسجلون.xlsx": "1.8",
    "الطلبة.xlsx": "1.8",
    "الطلبة_المنتظمين.xlsx": "1.8",
    "الخريجون.xlsx": "4.1",
    "المساقات_الالكترونية.xlsx": "2.4",
    "انشطة_الطلبة.xlsx": "6.3",
    "المختبرات.xlsx": "5.4",
    "نسبة_الحوسبة.xlsx": "5.5",
    
    # ملفات إضافية
    "الاجراءات_المحوسبة.xlsx": "5.5",
    "البنية_التحتية.xlsx": "5.1",
    "الصيانة.xlsx": "5.2",
    "صيانة_المباني.xlsx": "5.2",
    "الايرادات.xlsx": "4.2",
    "المصروفات.xlsx": "4.1",
    "المقتنيات.xlsx": "5.3",
    "قواعد_البيانات.xlsx": "5.3",
    "البرامج_التدريبية.xlsx": "2.6",
    "الشهادات_المهنية.xlsx": "2.6",
    "المقبولون_الجدد.xlsx": "1.8",
    "الزيارات_الدولية.xlsx": "1.10",
    "اللجان.xlsx": "6.5",
}

# ============================================
# طريقة حساب القيمة لكل نوع بند
# ============================================
VALUE_EXTRACTORS = {
    # العدد (default): عدد الصفوف
    "count": lambda df, col=None: len(df),
    
    # المجموع: جمع عمود معين
    "sum": lambda df, col: df[col].sum() if col in df.columns else 0,
    
    # المتوسط: للاستبانات
    "average": lambda df, col: round(df[col].mean(), 2) if col in df.columns else 0,
    
    # أول قيمة: للتصنيفات
    "first": lambda df, col: df[col].iloc[0] if col in df.columns and len(df) > 0 else None,
    
    # نسبة: حساب نسبة
    "percentage": lambda df, col1, col2: round((df[col1].sum() / df[col2].sum()) * 100, 2) if col2 in df.columns else 0,
}

# تحديد طريقة الحساب لكل بند
ITEM_VALUE_CONFIG = {
    "1.1": ("count", None),  # عدد البرامج
    "1.4": ("count", None),  # عدد البرامج المستحدثة
    "1.8": ("sum", "المجموع"),  # عدد الطلبة
    "2.3": ("average", "المتوسط"),  # رضا التدريسيين
    "2.4": ("average", "المتوسط"),  # رضا الطلبة
    "2.5": ("count", None),  # الموفدون
    "2.6": ("count", None),  # الدورات
    "3.1": ("count", None),  # الأبحاث
    "3.3": ("count", None),  # براءات + جوائز
    "3.6": ("count", None),  # المشاريع
    "3.7": ("sum", "المخصص"),  # موازنة البحث
    "4.1": ("sum", "المبلغ"),  # الموازنة
    "6.1": ("count", None),  # مشاريع خدمة المجتمع
    "6.3": ("count", None),  # الأنشطة
}


def clean_dataframe(df):
    """تنظيف DataFrame للحفظ كـ JSON"""
    import numpy as np
    
    df = df.copy()
    
    # Handle NaN
    df = df.fillna('')
    
    # Convert numpy types to Python native types
    for col in df.columns:
        # Convert to native Python types
        df[col] = df[col].apply(lambda x: 
            int(x) if isinstance(x, (np.integer, np.int64)) else
            float(x) if isinstance(x, (np.floating, np.float64)) else
            str(x) if x != '' else ''
        )
        # Clean 'nan' strings
        df[col] = df[col].replace('nan', '')
    
    return df


def extract_value(df, item_code):
    """استخراج القيمة حسب نوع البند"""
    config = ITEM_VALUE_CONFIG.get(item_code, ("count", None))
    method = config[0]
    col = config[1] if len(config) > 1 else None
    
    try:
        if method == "count":
            return len(df)
        elif method == "sum" and col and col in df.columns:
            # Convert to numeric first
            numeric_col = pd.to_numeric(df[col], errors='coerce').fillna(0)
            return float(numeric_col.sum())
        elif method == "average" and col and col in df.columns:
            numeric_col = pd.to_numeric(df[col], errors='coerce').fillna(0)
            return round(float(numeric_col.mean()), 2)
        elif method == "first" and col and col in df.columns and len(df) > 0:
            return df[col].iloc[0]
        else:
            return len(df)
    except Exception as e:
        print(f"      ⚠️ خطأ في استخراج القيمة: {e}")
        return len(df)


def import_data():
    """الاستيراد الشامل"""
    period = DataCollectionPeriod.objects.first()
    if not period:
        print("❌ لا توجد فترة جمع!")
        return
    
    print(f"📅 الفترة: {period.name}")
    print(f"📂 المسار: {DATA_PATH}")
    print("=" * 60)
    
    stats = {
        'files_processed': 0,
        'files_skipped': 0,
        'items_updated': 0,
        'tables_saved': 0,
    }
    
    # تتبع البيانات لكل بند (قد يكون أكثر من ملف لنفس البند)
    item_data = {}  # {item_code: {'tables': [], 'values': []}}
    
    # معالجة كل مجلد
    for folder in sorted(DATA_PATH.iterdir()):
        if not folder.is_dir():
            continue
        
        folder_name = folder.name.split('_', 1)[-1] if '_' in folder.name else folder.name
        print(f"\n📁 {folder.name}")
        
        # معالجة كل ملف Excel
        for excel_file in folder.glob("*.xlsx"):
            try:
                df = pd.read_excel(excel_file)
                if df.empty:
                    stats['files_skipped'] += 1
                    continue
                
                file_name = excel_file.name
                item_code = FILE_TO_ITEM.get(file_name)
                
                if not item_code:
                    # حاول البحث بدون .xlsx
                    for key, code in FILE_TO_ITEM.items():
                        if key.replace('.xlsx', '') in file_name.replace('.xlsx', ''):
                            item_code = code
                            break
                
                # Clean dataframe
                df_clean = clean_dataframe(df)
                table_data = df_clean.to_dict('records')
                
                # Extract value
                value = extract_value(df, item_code) if item_code else len(df)
                
                print(f"   📄 {file_name}: {len(df)} صف", end="")
                
                if item_code:
                    # تجميع البيانات لهذا البند
                    if item_code not in item_data:
                        item_data[item_code] = {'tables': [], 'values': [], 'source': folder_name}
                    
                    item_data[item_code]['tables'].append({
                        'file': file_name,
                        'folder': folder_name,
                        'data': table_data,
                        'columns': list(df.columns),
                    })
                    item_data[item_code]['values'].append(value)
                    
                    print(f" → {item_code} ✅")
                    stats['files_processed'] += 1
                else:
                    print(f" → ⚠️ لا يوجد ربط")
                    stats['files_skipped'] += 1
                    
            except Exception as e:
                print(f"   ❌ خطأ في {excel_file.name}: {e}")
                stats['files_skipped'] += 1
    
    # حفظ البيانات في ItemDraft
    print("\n" + "=" * 60)
    print("💾 حفظ البيانات في المنصة...")
    
    for item_code, data in item_data.items():
        try:
            item = Item.objects.filter(code=item_code).first()
            if not item:
                print(f"   ⚠️ البند {item_code} غير موجود في القالب")
                continue
            
            draft, created = ItemDraft.objects.get_or_create(
                period=period,
                item=item,
                defaults={'status': 'not_started'}
            )
            
            # دمج كل الجداول
            all_tables = []
            for t in data['tables']:
                all_tables.extend(t['data'])
            
            # حساب القيمة الإجمالية
            total_value = sum(data['values']) if data['values'] else 0
            
            # حفظ
            draft.table_data = all_tables
            draft.current_value = total_value
            draft.save(update_fields=['table_data', 'current_value', 'updated_at'])
            
            print(f"   ✅ {item_code}: {item.name[:30]}... = {total_value} ({len(all_tables)} صف)")
            stats['items_updated'] += 1
            stats['tables_saved'] += len(all_tables)
            
        except Exception as e:
            print(f"   ❌ خطأ في حفظ {item_code}: {e}")
    
    # ملخص
    print("\n" + "=" * 60)
    print("📊 ملخص الاستيراد:")
    print(f"   ملفات تمت معالجتها: {stats['files_processed']}")
    print(f"   ملفات بدون ربط: {stats['files_skipped']}")
    print(f"   بنود تم تحديثها: {stats['items_updated']}")
    print(f"   إجمالي صفوف الجداول: {stats['tables_saved']}")


if __name__ == '__main__':
    import_data()
