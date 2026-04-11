import sys
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

def iter_block_items(parent):
    """Yield each paragraph and table child within *parent*, in document order."""
    for child in parent.element.body:
        if child.tag == qn('w:p'):
            yield Paragraph(child, parent)
        elif child.tag == qn('w:tbl'):
            yield Table(child, parent)

def get_paragraph_info(para):
    """Extract detailed info from a paragraph."""
    style_name = para.style.name if para.style else "None"
    text = para.text.strip()
    
    # Check bold
    is_bold = False
    for run in para.runs:
        if run.bold:
            is_bold = True
            break
    
    # Check alignment
    alignment = str(para.alignment) if para.alignment else "None"
    
    # Check for images/drawings
    has_image = False
    for run in para.runs:
        if run._element.findall(qn('w:drawing')):
            has_image = True
            break
        if run._element.findall('.//'+qn('w:drawing')):
            has_image = True
            break
    
    # Also check inline shapes in the XML
    drawings = para._element.findall('.//' + qn('w:drawing'))
    if drawings:
        has_image = True
    
    # Check for page breaks
    has_page_break = False
    for run in para.runs:
        brs = run._element.findall(qn('w:br'))
        for br in brs:
            if br.get(qn('w:type')) == 'page':
                has_page_break = True
    
    return {
        'style': style_name,
        'text': text,
        'is_bold': is_bold,
        'alignment': alignment,
        'has_image': has_image,
        'has_page_break': has_page_break,
        'num_runs': len(para.runs),
    }

def print_table_contents(table, elem_num):
    """Print all contents of a table."""
    rows = table.rows
    cols = table.columns
    print(f"  Table dimensions: {len(rows)} rows x {len(cols)} columns")
    
    # Check for merged cells
    for i, row in enumerate(rows):
        for j, cell in enumerate(row.cells):
            cell_text = cell.text.strip()
            if cell_text:
                # Truncate very long text for readability but still show substantial content
                display_text = cell_text[:500] + "..." if len(cell_text) > 500 else cell_text
                print(f"  Cell[{i},{j}]: {display_text}")
            else:
                print(f"  Cell[{i},{j}]: (empty)")

def main():
    filepath = '/Users/mohammadhabahbeh/Desktop/My File/Project/report-platform/habahbeh/التقرير السنوي لجامعة البترا 2023-2024 حتى تاريخ 29.09.2025.docx'
    
    print(f"Opening document...")
    doc = Document(filepath)
    
    in_section = False
    elem_num = 0
    section_start_found = False
    
    # We need to find "1.9" - could be in heading or paragraph
    # Stop at "1.10"
    
    for item in iter_block_items(doc):
        if isinstance(item, Paragraph):
            text = item.text.strip()
            style_name = item.style.name if item.style else ""
            
            # Detect section 1.9 start
            # Look for text that starts with 1.9 or contains "1.9" in a heading context
            if not in_section:
                # Check multiple patterns for section 1.9
                if (text.startswith('1.9') or 
                    text.startswith('1-9') or
                    text.startswith('9.1') or  # RTL possibility
                    text.startswith('9-1') or
                    '1.9' in text or '1-9' in text or '٩.١' in text or '٩-١' in text or '1,9' in text):
                    # Check if it's a heading-like element
                    if ('heading' in style_name.lower() or 
                        'عنوان' in style_name.lower() or
                        any(run.bold for run in item.runs) or
                        len(text) < 200):
                        in_section = True
                        section_start_found = True
                        print(f"\n{'='*80}")
                        print(f"SECTION 1.9 FOUND!")
                        print(f"{'='*80}\n")
            
            if in_section:
                # Check for section 1.10 to stop
                if elem_num > 0:  # Don't check the very first element
                    if (text.startswith('1.10') or 
                        text.startswith('1-10') or
                        text.startswith('10.1') or
                        text.startswith('10-1') or
                        ('1.10' in text and ('heading' in style_name.lower() or 'عنوان' in style_name.lower() or any(run.bold for run in item.runs))) or
                        ('1-10' in text and ('heading' in style_name.lower() or 'عنوان' in style_name.lower() or any(run.bold for run in item.runs)))):
                        if len(text) < 200:
                            print(f"\n{'='*80}")
                            print(f"SECTION 1.10 REACHED - STOPPING")
                            print(f"(First line of 1.10: {text})")
                            print(f"{'='*80}")
                            break
                
                elem_num += 1
                info = get_paragraph_info(item)
                
                print(f"\n--- Element #{elem_num}: PARAGRAPH ---")
                print(f"  Style: {info['style']}")
                print(f"  Bold: {info['is_bold']}")
                print(f"  Alignment: {info['alignment']}")
                print(f"  Has Image: {info['has_image']}")
                print(f"  Has Page Break: {info['has_page_break']}")
                print(f"  Num Runs: {info['num_runs']}")
                if info['text']:
                    display = info['text'][:1000] + "..." if len(info['text']) > 1000 else info['text']
                    print(f"  Text: {display}")
                else:
                    print(f"  Text: (empty)")
        
        elif isinstance(item, Table):
            if in_section:
                elem_num += 1
                print(f"\n--- Element #{elem_num}: TABLE ---")
                print_table_contents(item, elem_num)
    
    if not section_start_found:
        print("\nSection 1.9 was NOT found with the primary patterns.")
        print("Let me scan all headings and bold paragraphs to find the numbering scheme...\n")
        
        count = 0
        for item in iter_block_items(doc):
            if isinstance(item, Paragraph):
                text = item.text.strip()
                style_name = item.style.name if item.style else ""
                if text and ('heading' in style_name.lower() or 'عنوان' in style_name.lower()):
                    count += 1
                    print(f"  Heading [{style_name}]: {text[:200]}")
                    if count > 100:
                        print("  ... (stopped after 100 headings)")
                        break
        
        # Also look for bold paragraphs with numbers
        print("\n\nBold paragraphs containing numbers near 1.9:")
        for item in iter_block_items(doc):
            if isinstance(item, Paragraph):
                text = item.text.strip()
                if text and any(run.bold for run in item.runs):
                    # Look for section-like numbering
                    import re
                    if re.search(r'1[\.\-\s]*(8|9|10)', text) or re.search(r'(8|9|10)[\.\-\s]*1', text):
                        style_name = item.style.name if item.style else ""
                        print(f"  [{style_name}] BOLD: {text[:300]}")
    
    print(f"\n\nTotal elements extracted from section 1.9: {elem_num}")

if __name__ == '__main__':
    main()
