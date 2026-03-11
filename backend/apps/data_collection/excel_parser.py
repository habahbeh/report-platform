"""
Excel file parser for data collection.
"""

import pandas as pd
from typing import Dict, List, Any
from io import BytesIO


def parse_excel_file(file_content: bytes, sheet_name: str = None) -> Dict[str, Any]:
    """
    Parse Excel file and return structured data.
    
    Args:
        file_content: Raw file bytes
        sheet_name: Specific sheet to parse (optional)
    
    Returns:
        Dictionary with parsed data
    """
    try:
        # Read Excel file
        excel_file = BytesIO(file_content)
        
        if sheet_name:
            df = pd.read_excel(excel_file, sheet_name=sheet_name)
            sheets_data = {sheet_name: dataframe_to_dict(df)}
        else:
            # Read all sheets
            excel = pd.ExcelFile(excel_file)
            sheets_data = {}
            for name in excel.sheet_names:
                df = pd.read_excel(excel, sheet_name=name)
                sheets_data[name] = dataframe_to_dict(df)
        
        return {
            'success': True,
            'sheets': sheets_data,
            'sheet_names': list(sheets_data.keys()),
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


def dataframe_to_dict(df: pd.DataFrame) -> Dict[str, Any]:
    """Convert DataFrame to dictionary with statistics."""
    # Clean column names
    df.columns = df.columns.str.strip()
    
    # Get basic stats
    rows = len(df)
    columns = list(df.columns)
    
    # Convert to records
    records = df.fillna('').to_dict('records')
    
    # Get summary statistics for numeric columns
    stats = {}
    for col in df.select_dtypes(include=['number']).columns:
        stats[col] = {
            'sum': float(df[col].sum()),
            'mean': float(df[col].mean()),
            'min': float(df[col].min()),
            'max': float(df[col].max()),
        }
    
    return {
        'rows': rows,
        'columns': columns,
        'records': records[:100],  # Limit to first 100 records
        'total_records': rows,
        'stats': stats,
    }


def extract_publications_data(file_content: bytes) -> Dict[str, Any]:
    """
    Extract research publications data from Excel.
    Expected columns: Title, Authors, Faculty, Year, Citations
    """
    result = parse_excel_file(file_content)
    
    if not result['success']:
        return result
    
    # Get first sheet
    first_sheet = result['sheets'][result['sheet_names'][0]]
    records = first_sheet['records']
    
    # Calculate statistics
    by_faculty = {}
    by_year = {}
    total_citations = 0
    
    for record in records:
        # By faculty
        faculty = record.get('Faculty', record.get('الكلية', 'غير محدد'))
        by_faculty[faculty] = by_faculty.get(faculty, 0) + 1
        
        # By year
        year = str(record.get('Year', record.get('السنة', 'غير محدد')))
        by_year[year] = by_year.get(year, 0) + 1
        
        # Citations
        citations = record.get('Citations', record.get('الاقتباسات', 0))
        if isinstance(citations, (int, float)):
            total_citations += citations
    
    return {
        'success': True,
        'total_publications': len(records),
        'total_citations': total_citations,
        'by_faculty': by_faculty,
        'by_year': by_year,
        'records': records,
    }


def extract_students_data(file_content: bytes) -> Dict[str, Any]:
    """
    Extract students data from Excel.
    Expected columns: Faculty, Program, Level, Count, Gender
    """
    result = parse_excel_file(file_content)
    
    if not result['success']:
        return result
    
    first_sheet = result['sheets'][result['sheet_names'][0]]
    records = first_sheet['records']
    
    total_students = 0
    by_faculty = {}
    by_level = {}
    by_gender = {'male': 0, 'female': 0}
    
    for record in records:
        count = record.get('Count', record.get('العدد', 1))
        if isinstance(count, (int, float)):
            total_students += count
            
            faculty = record.get('Faculty', record.get('الكلية', 'غير محدد'))
            by_faculty[faculty] = by_faculty.get(faculty, 0) + count
            
            level = record.get('Level', record.get('المستوى', 'غير محدد'))
            by_level[level] = by_level.get(level, 0) + count
            
            gender = record.get('Gender', record.get('الجنس', '')).lower()
            if 'male' in gender or 'ذكر' in gender:
                by_gender['male'] += count
            elif 'female' in gender or 'أنثى' in gender:
                by_gender['female'] += count
    
    return {
        'success': True,
        'total_students': int(total_students),
        'by_faculty': by_faculty,
        'by_level': by_level,
        'by_gender': by_gender,
        'records': records,
    }


def extract_staff_data(file_content: bytes) -> Dict[str, Any]:
    """
    Extract staff/faculty data from Excel.
    Expected columns: Name, Faculty, Rank, Degree, Nationality
    """
    result = parse_excel_file(file_content)
    
    if not result['success']:
        return result
    
    first_sheet = result['sheets'][result['sheet_names'][0]]
    records = first_sheet['records']
    
    by_faculty = {}
    by_rank = {}
    by_degree = {}
    by_nationality = {}
    
    for record in records:
        faculty = record.get('Faculty', record.get('الكلية', 'غير محدد'))
        by_faculty[faculty] = by_faculty.get(faculty, 0) + 1
        
        rank = record.get('Rank', record.get('الرتبة', 'غير محدد'))
        by_rank[rank] = by_rank.get(rank, 0) + 1
        
        degree = record.get('Degree', record.get('الدرجة', 'غير محدد'))
        by_degree[degree] = by_degree.get(degree, 0) + 1
        
        nationality = record.get('Nationality', record.get('الجنسية', 'غير محدد'))
        by_nationality[nationality] = by_nationality.get(nationality, 0) + 1
    
    return {
        'success': True,
        'total_staff': len(records),
        'by_faculty': by_faculty,
        'by_rank': by_rank,
        'by_degree': by_degree,
        'by_nationality': by_nationality,
        'records': records,
    }
