"""
Data Collection Service - Excel upload and parsing.
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
import pandas as pd


def parse_excel_file(file_path: str) -> Dict[str, Any]:
    """
    Parse an Excel file and return structured data.
    
    Args:
        file_path: Path to the Excel file
    
    Returns:
        Dictionary with parsed data
    """
    result = {
        'success': True,
        'sheets': [],
        'data': {},
        'summary': {}
    }
    
    try:
        # Read all sheets
        excel_file = pd.ExcelFile(file_path)
        
        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Clean column names
            df.columns = [str(col).strip() for col in df.columns]
            
            # Convert to JSON-serializable format
            records = df.to_dict('records')
            
            # Clean NaN values
            clean_records = []
            for record in records:
                clean_record = {}
                for key, value in record.items():
                    if pd.isna(value):
                        clean_record[key] = None
                    elif isinstance(value, (pd.Timestamp, datetime)):
                        clean_record[key] = value.isoformat()
                    else:
                        clean_record[key] = value
                clean_records.append(clean_record)
            
            result['sheets'].append(sheet_name)
            result['data'][sheet_name] = clean_records
            
            # Generate summary
            result['summary'][sheet_name] = {
                'rows': len(df),
                'columns': list(df.columns),
                'numeric_summary': {}
            }
            
            # Numeric columns summary
            numeric_cols = df.select_dtypes(include=['number']).columns
            for col in numeric_cols:
                result['summary'][sheet_name]['numeric_summary'][col] = {
                    'sum': float(df[col].sum()) if not pd.isna(df[col].sum()) else 0,
                    'mean': float(df[col].mean()) if not pd.isna(df[col].mean()) else 0,
                    'min': float(df[col].min()) if not pd.isna(df[col].min()) else 0,
                    'max': float(df[col].max()) if not pd.isna(df[col].max()) else 0,
                }
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'sheets': [],
            'data': {},
            'summary': {}
        }


def extract_research_data(file_path: str) -> Dict[str, Any]:
    """
    Extract research data from an Excel file.
    Expects columns like: faculty, publications, citations, h_index, etc.
    """
    result = parse_excel_file(file_path)
    
    if not result['success']:
        return result
    
    # Try to find research-related data
    research_data = {
        'total_publications': 0,
        'total_citations': 0,
        'h_index': 0,
        'by_faculty': {},
        'funded_projects': 0,
        'patents': 0
    }
    
    for sheet_name, records in result['data'].items():
        for record in records:
            # Look for common column names (Arabic and English)
            for key, value in record.items():
                key_lower = key.lower()
                
                if any(k in key_lower for k in ['publication', 'منشور', 'بحث', 'paper']):
                    if isinstance(value, (int, float)) and not pd.isna(value):
                        research_data['total_publications'] += int(value)
                
                elif any(k in key_lower for k in ['citation', 'اقتباس', 'استشهاد']):
                    if isinstance(value, (int, float)) and not pd.isna(value):
                        research_data['total_citations'] += int(value)
                
                elif any(k in key_lower for k in ['h-index', 'h_index', 'مؤشر']):
                    if isinstance(value, (int, float)) and not pd.isna(value):
                        research_data['h_index'] = max(research_data['h_index'], int(value))
                
                elif any(k in key_lower for k in ['faculty', 'كلية', 'college']):
                    faculty_name = str(value)
                    if faculty_name not in research_data['by_faculty']:
                        research_data['by_faculty'][faculty_name] = 0
                    research_data['by_faculty'][faculty_name] += 1
                
                elif any(k in key_lower for k in ['project', 'مشروع', 'funded']):
                    if isinstance(value, (int, float)) and not pd.isna(value):
                        research_data['funded_projects'] += int(value)
                
                elif any(k in key_lower for k in ['patent', 'براءة']):
                    if isinstance(value, (int, float)) and not pd.isna(value):
                        research_data['patents'] += int(value)
    
    result['research_data'] = research_data
    return result


def extract_hr_data(file_path: str) -> Dict[str, Any]:
    """
    Extract HR data from an Excel file.
    """
    result = parse_excel_file(file_path)
    
    if not result['success']:
        return result
    
    hr_data = {
        'total_employees': 0,
        'academic_staff': 0,
        'administrative_staff': 0,
        'by_department': {},
        'by_rank': {},
        'phd_holders': 0
    }
    
    for sheet_name, records in result['data'].items():
        for record in records:
            hr_data['total_employees'] += 1
            
            for key, value in record.items():
                key_lower = key.lower()
                
                if any(k in key_lower for k in ['department', 'قسم', 'دائرة']):
                    dept = str(value) if value else 'غير محدد'
                    hr_data['by_department'][dept] = hr_data['by_department'].get(dept, 0) + 1
                
                elif any(k in key_lower for k in ['rank', 'رتبة', 'درجة', 'title']):
                    rank = str(value) if value else 'غير محدد'
                    hr_data['by_rank'][rank] = hr_data['by_rank'].get(rank, 0) + 1
                
                elif any(k in key_lower for k in ['type', 'نوع', 'category']):
                    if value and 'أكاديم' in str(value).lower():
                        hr_data['academic_staff'] += 1
                    elif value:
                        hr_data['administrative_staff'] += 1
                
                elif any(k in key_lower for k in ['degree', 'مؤهل', 'education']):
                    if value and ('phd' in str(value).lower() or 'دكتوراه' in str(value)):
                        hr_data['phd_holders'] += 1
    
    result['hr_data'] = hr_data
    return result


def validate_excel_template(file_path: str, required_columns: List[str]) -> Dict[str, Any]:
    """
    Validate that an Excel file has required columns.
    """
    result = {
        'valid': True,
        'missing_columns': [],
        'extra_columns': [],
        'found_columns': []
    }
    
    try:
        df = pd.read_excel(file_path)
        df.columns = [str(col).strip().lower() for col in df.columns]
        
        result['found_columns'] = list(df.columns)
        required_lower = [col.lower() for col in required_columns]
        
        for required in required_lower:
            if required not in df.columns:
                result['missing_columns'].append(required)
                result['valid'] = False
        
        for col in df.columns:
            if col not in required_lower:
                result['extra_columns'].append(col)
        
        return result
        
    except Exception as e:
        return {
            'valid': False,
            'error': str(e),
            'missing_columns': [],
            'extra_columns': [],
            'found_columns': []
        }


def generate_excel_template(template_type: str, output_path: str) -> bool:
    """
    Generate an Excel template for data collection.
    """
    templates = {
        'research': {
            'columns': ['الكلية', 'القسم', 'عدد المنشورات', 'عدد الاقتباسات', 'H-Index', 'المشاريع الممولة'],
            'sample_data': [
                ['كلية تكنولوجيا المعلومات', 'علوم الحاسوب', 25, 150, 8, 3],
                ['كلية الهندسة', 'الهندسة المدنية', 18, 95, 6, 2],
            ]
        },
        'hr': {
            'columns': ['الاسم', 'الكلية', 'القسم', 'الرتبة', 'المؤهل العلمي', 'سنة التعيين'],
            'sample_data': [
                ['أ.د. محمد أحمد', 'كلية تكنولوجيا المعلومات', 'علوم الحاسوب', 'أستاذ', 'دكتوراه', 2015],
                ['د. سارة خالد', 'كلية الهندسة', 'الهندسة المدنية', 'أستاذ مساعد', 'دكتوراه', 2018],
            ]
        },
        'community': {
            'columns': ['اسم النشاط', 'النوع', 'التاريخ', 'عدد المشاركين', 'الجهة المستفيدة', 'ملاحظات'],
            'sample_data': [
                ['يوم تطوعي', 'خدمة مجتمع', '2024-03-15', 50, 'جمعية خيرية', 'نجاح كبير'],
                ['ورشة تدريبية', 'تدريب', '2024-04-20', 30, 'مدارس حكومية', ''],
            ]
        }
    }
    
    if template_type not in templates:
        return False
    
    template = templates[template_type]
    df = pd.DataFrame(template['sample_data'], columns=template['columns'])
    
    try:
        df.to_excel(output_path, index=False, sheet_name='البيانات')
        return True
    except Exception:
        return False
