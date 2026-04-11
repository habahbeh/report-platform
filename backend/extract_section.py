"""
Extract section 1.9 from the annual report docx file.
Captures all paragraphs and tables between section 1.9 and the next section (1.10 or new major heading).
"""

from docx import Document
from docx.oxml.ns import qn
import re

FILE_PATH = (
    "/Users/mohammadhabahbeh/Desktop/My File/Project/report-platform/"
    "habahbeh/التقرير السنوي لجامعة البترا 2023-2024 حتى تاريخ 29.09.2025.docx"
)

def extract_section_1_9(filepath):
    doc = Document(filepath)

    # Iterate over the document body children in order (paragraphs and tables interleaved)
    body = doc.element.body

    capturing = False
    found = False

    print("=" * 100)
    print("SEARCHING FOR SECTION 1.9 ...")
    print("=" * 100)

    for element in body:
        tag = element.tag.split('}')[-1] if '}' in element.tag else element.tag

        if tag == 'p':
            # Collect all text from runs
            full_text = ''
            for node in element.iter():
                if node.tag.endswith('}t') or node.tag == 't':
                    if node.text:
                        full_text += node.text
            text = full_text.strip()

            if not capturing:
                # Check if this paragraph starts section 1.9
                if '1.9' in text or '1-9' in text:
                    capturing = True
                    found = True
                    print(f"\n>>> FOUND SECTION START <<<")
                    print("-" * 100)
                    print(f"[PARAGRAPH] {text}")
            else:
                # Check if we hit the next section
                if text and (
                    re.match(r'\s*1[\.\-]\s*10\b', text) or
                    re.match(r'\s*1[\.\-]\s*11\b', text) or
                    re.match(r'\s*2\s*[\.\-\:]', text) or
                    (re.match(r'\s*\d+[\.\-]\s*\d+', text) and not re.match(r'\s*1[\.\-]\s*9\b', text))
                ):
                    print("-" * 100)
                    print(f">>> END OF SECTION (next section detected): {text[:120]}")
                    break

                if text:
                    print(f"[PARAGRAPH] {text}")

        elif tag == 'tbl':
            if capturing:
                rows = element.findall(qn('w:tr'))
                print(f"\n[TABLE] ({len(rows)} rows)")
                for row_idx, row in enumerate(rows):
                    cells = row.findall(qn('w:tc'))
                    cell_texts = []
                    for cell in cells:
                        cell_text = ''
                        for p in cell.findall(qn('w:p')):
                            for node in p.iter():
                                if node.tag.endswith('}t') or node.tag == 't':
                                    if node.text:
                                        cell_text += node.text
                        cell_texts.append(cell_text.strip())
                    print(f"  Row {row_idx:3d}: {' | '.join(cell_texts)}")
                print("[END TABLE]\n")

    if not found:
        print("\nSection 1.9 NOT FOUND with '1.9' pattern.")
        print("\nSearching for paragraphs with section-like numbers near 1.9:")
        for element in body:
            tag = element.tag.split('}')[-1] if '}' in element.tag else element.tag
            if tag == 'p':
                full_text = ''
                for node in element.iter():
                    if node.tag.endswith('}t') or node.tag == 't':
                        if node.text:
                            full_text += node.text
                text = full_text.strip()
                if text and re.search(r'1[\.\-\s]*[89]|1[\.\-\s]*10|نسبة الطلبة غير', text):
                    print(f"  -> {text[:200]}")

    print("\n" + "=" * 100)
    print("EXTRACTION COMPLETE")
    print("=" * 100)


if __name__ == '__main__':
    extract_section_1_9(FILE_PATH)
