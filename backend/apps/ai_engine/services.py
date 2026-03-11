"""
AI Engine Service - Generate report content using Claude or Gemini.

Supports 3 modes:
- "claude": Claude API (pay per use)
- "cli": Claude CLI (uses Pro subscription - free for development!)
- "gemini": Gemini API (free tier available)
"""

import os
import time
import subprocess
from typing import Optional
from anthropic import Anthropic
import google.generativeai as genai

# Initialize clients
anthropic_client = Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY', ''))

# Configure Gemini
genai.configure(api_key=os.environ.get('GOOGLE_API_KEY', ''))

# System prompt for Arabic report writing
SYSTEM_PROMPT = """أنت كاتب تقارير مؤسسية محترف باللغة العربية الفصحى.

مهمتك: كتابة أقسام تقارير رسمية بناءً على البيانات المقدمة.

قواعد الكتابة:
1. استخدم اللغة العربية الفصحى الرسمية
2. كن دقيقاً في ذكر الأرقام والإحصائيات
3. اربط البيانات بالسياق المؤسسي
4. استخدم صيغة الغائب (حققت الجامعة، بلغ عدد...)
5. أضف مقارنات مع السنوات السابقة إن توفرت
6. لا تخترع أرقاماً غير موجودة في البيانات
7. اجعل النص متماسكاً ومترابطاً
8. استخدم فقرات منظمة وواضحة

المؤسسة: جامعة البترا - University of Petra
"""


def generate_with_gemini(prompt: str, word_count: int = 500) -> dict:
    """Generate content using Gemini Flash."""
    start_time = time.time()
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        full_prompt = f"""{SYSTEM_PROMPT}

{prompt}

الطول المطلوب: حوالي {word_count} كلمة.
اكتب بأسلوب رسمي أكاديمي مناسب للتقارير الجامعية."""

        response = model.generate_content(full_prompt)
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Gemini doesn't provide exact token counts easily
        content = response.text
        estimated_tokens = len(content.split()) * 2  # Rough estimate
        
        return {
            'success': True,
            'content': content,
            'input_tokens': estimated_tokens // 2,
            'output_tokens': estimated_tokens // 2,
            'total_tokens': estimated_tokens,
            'cost': 0.001,  # Very cheap
            'duration_ms': duration_ms,
            'model': 'gemini-2.0-flash',
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'content': '',
            'input_tokens': 0,
            'output_tokens': 0,
            'total_tokens': 0,
            'cost': 0,
            'duration_ms': int((time.time() - start_time) * 1000),
            'model': 'gemini-2.0-flash',
        }


def generate_with_cli(prompt: str, word_count: int = 500) -> dict:
    """
    Generate content using Claude Code CLI (uses Max/Pro subscription).
    Best for development - no API costs!
    
    Uses stdin pipe: echo "prompt" | claude -p --output-format text
    """
    start_time = time.time()
    
    full_prompt = f"""{SYSTEM_PROMPT}

{prompt}

الطول المطلوب: حوالي {word_count} كلمة.
اكتب بأسلوب رسمي أكاديمي مناسب للتقارير الجامعية.
أعطني النص فقط بدون أي تنسيق markdown أو شرح."""

    try:
        # Run Claude Code CLI using temp file for reliable input
        import tempfile
        import os
        
        # Write prompt to temp file to handle special characters
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(full_prompt)
            temp_path = f.name
        
        try:
            # Create clean environment WITHOUT ANTHROPIC_API_KEY
            # (Django settings might set an invalid key that breaks CLI auth)
            clean_env = os.environ.copy()
            clean_env.pop('ANTHROPIC_API_KEY', None)  # Remove if exists
            
            cmd = f'cat "{temp_path}" | claude -p --output-format text'
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=180,
                env=clean_env,  # Use clean environment
            )
        finally:
            os.unlink(temp_path)  # Clean up temp file
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        content = result.stdout.strip()
        
        if result.returncode != 0 and not content:
            error_msg = result.stderr.strip() if result.stderr else 'CLI command failed'
            return {
                'success': False,
                'error': error_msg,
                'content': '',
                'input_tokens': 0,
                'output_tokens': 0,
                'total_tokens': 0,
                'cost': 0,
                'duration_ms': duration_ms,
                'model': 'claude-code (Max)',
            }
        
        # Estimate tokens (rough: ~1.3 tokens per Arabic word)
        word_count_actual = len(content.split())
        estimated_tokens = int(word_count_actual * 1.5)
        
        return {
            'success': True,
            'content': content,
            'input_tokens': len(full_prompt.split()),
            'output_tokens': estimated_tokens,
            'total_tokens': len(full_prompt.split()) + estimated_tokens,
            'cost': 0,  # Free with Max subscription!
            'duration_ms': duration_ms,
            'model': 'claude-code (Max)',
        }
        
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'CLI timeout (>3 minutes). Try shorter prompt.',
            'content': '',
            'input_tokens': 0,
            'output_tokens': 0,
            'total_tokens': 0,
            'cost': 0,
            'duration_ms': int((time.time() - start_time) * 1000),
            'model': 'claude-code (Max)',
        }
    except FileNotFoundError:
        return {
            'success': False,
            'error': 'Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code',
            'content': '',
            'input_tokens': 0,
            'output_tokens': 0,
            'total_tokens': 0,
            'cost': 0,
            'duration_ms': int((time.time() - start_time) * 1000),
            'model': 'claude-code (Max)',
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'content': '',
            'input_tokens': 0,
            'output_tokens': 0,
            'total_tokens': 0,
            'cost': 0,
            'duration_ms': int((time.time() - start_time) * 1000),
            'model': 'claude-code (Max)',
        }


def generate_with_claude(prompt: str, word_count: int = 500) -> dict:
    """Generate content using Claude."""
    start_time = time.time()
    
    full_prompt = f"""{prompt}

الطول المطلوب: حوالي {word_count} كلمة.
اكتب بأسلوب رسمي أكاديمي مناسب للتقارير الجامعية."""

    try:
        response = anthropic_client.messages.create(
            model="claude-3-haiku-20240307",  # أرخص 100x من Sonnet!
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": full_prompt}
            ]
        )
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        content = response.content[0].text
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        # Haiku 3 pricing: $0.25/M input, $1.25/M output
        cost = (input_tokens * 0.00025 + output_tokens * 0.00125) / 1000
        
        return {
            'success': True,
            'content': content,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'total_tokens': input_tokens + output_tokens,
            'cost': cost,
            'duration_ms': duration_ms,
            'model': 'claude-3-haiku-20240307',
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'content': '',
            'input_tokens': 0,
            'output_tokens': 0,
            'total_tokens': 0,
            'cost': 0,
            'duration_ms': int((time.time() - start_time) * 1000),
            'model': 'claude-3-haiku-20240307',
        }


def generate_section_content(
    section_title: str,
    ai_prompt: str,
    data: dict,
    word_count: int = 500,
    period: str = "2023-2024",
    model: str = "cli"  # "gemini" (free), "cli" (Max plan), or "claude" (API)
) -> dict:
    """
    Generate content for a report section.
    
    Args:
        section_title: Title of the section
        ai_prompt: The prompt template for this section
        data: Data dictionary to fill in the prompt
        word_count: Target word count
        period: Academic year period
        model: Which model to use:
            - "cli": Claude CLI with Pro subscription (FREE for dev!)
            - "claude": Claude API (pay per use)
            - "gemini": Gemini API (free tier)
    
    Returns:
        dict with content, tokens_used, cost, etc.
    """
    
    # Format the prompt with data
    try:
        formatted_prompt = ai_prompt.format(
            academic_year=period,
            **data
        )
    except KeyError:
        formatted_prompt = ai_prompt
    
    full_prompt = f"""اكتب قسم "{section_title}" للتقرير السنوي.

{formatted_prompt}"""

    if model == "cli":
        return generate_with_cli(full_prompt, word_count)
    elif model == "claude":
        return generate_with_claude(full_prompt, word_count)
    else:
        return generate_with_gemini(full_prompt, word_count)


def generate_introduction(
    organization_name: str = "جامعة البترا",
    period: str = "2023-2024",
    highlights: Optional[list] = None,
    model: str = "cli"  # Default to Gemini (free tier)
) -> dict:
    """Generate report introduction."""
    
    highlights_text = ""
    if highlights:
        highlights_text = "أبرز الإنجازات:\n" + "\n".join(f"- {h}" for h in highlights)
    
    prompt = f"""اكتب مقدمة للتقرير السنوي لـ {organization_name} للعام الأكاديمي {period}.

تضمن:
- نبذة موجزة عن الجامعة ورؤيتها ورسالتها
- إشارة للعام الأكاديمي وأهم المحطات
- تمهيد لمحتوى التقرير

{highlights_text}"""
    
    return generate_section_content(
        section_title="المقدمة",
        ai_prompt=prompt,
        data={},
        word_count=350,
        period=period,
        model=model
    )


def generate_research_section(
    publications_count: int,
    citations_count: int,
    h_index: int,
    funded_projects: int = 0,
    patents: int = 0,
    by_faculty: Optional[dict] = None,
    period: str = "2023-2024",
    model: str = "cli"  # Default to Gemini (free tier)
) -> dict:
    """Generate research and innovation section."""
    
    faculty_text = ""
    if by_faculty:
        faculty_text = "توزيع المنشورات حسب الكلية:\n"
        for faculty, count in by_faculty.items():
            faculty_text += f"- {faculty}: {count} منشور\n"
    
    prompt = f"""اكتب قسم البحث العلمي والابتكار بناءً على البيانات التالية:

الإحصائيات:
- عدد المنشورات في Scopus: {publications_count}
- عدد الاقتباسات: {citations_count}
- مؤشر H-index: {h_index}
- المشاريع البحثية الممولة: {funded_projects}
- براءات الاختراع: {patents}

{faculty_text}

تضمن:
1. فقرة افتتاحية تلخص الإنجازات البحثية
2. تحليل المنشورات والاقتباسات
3. المشاريع البحثية الممولة إن وجدت
4. براءات الاختراع والجوائز
5. خاتمة موجزة"""
    
    return generate_section_content(
        section_title="المعيار الثالث: البحث العلمي والابتكار",
        ai_prompt=prompt,
        data={},
        word_count=700,
        period=period,
        model=model
    )


def generate_conclusion(
    key_achievements: Optional[list] = None,
    challenges: Optional[list] = None,
    future_plans: Optional[list] = None,
    period: str = "2023-2024",
    model: str = "cli"  # Default to Gemini (free tier)
) -> dict:
    """Generate report conclusion."""
    
    achievements_text = ""
    if key_achievements:
        achievements_text = "أبرز الإنجازات:\n" + "\n".join(f"- {a}" for a in key_achievements)
    
    challenges_text = ""
    if challenges:
        challenges_text = "التحديات:\n" + "\n".join(f"- {c}" for c in challenges)
    
    plans_text = ""
    if future_plans:
        plans_text = "الخطط المستقبلية:\n" + "\n".join(f"- {p}" for p in future_plans)
    
    prompt = f"""اكتب خاتمة للتقرير السنوي للعام الأكاديمي {period}.

{achievements_text}

{challenges_text}

{plans_text}

تضمن:
- ملخص لأبرز الإنجازات
- الدروس المستفادة
- الرؤية المستقبلية"""
    
    return generate_section_content(
        section_title="الخاتمة والتوصيات",
        ai_prompt=prompt,
        data={},
        word_count=350,
        period=period,
        model=model
    )
