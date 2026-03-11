'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

type GenerationType = 'custom' | 'intro' | 'research' | 'conclusion';
type AIModel = 'cli' | 'claude' | 'gemini';

export default function AIPage() {
  const [type, setType] = useState<GenerationType>('custom');
  const [model, setModel] = useState<AIModel>('gemini');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  
  // Custom prompt
  const [prompt, setPrompt] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [wordCount, setWordCount] = useState(500);
  
  // Research data
  const [publications, setPublications] = useState('');
  const [citations, setCitations] = useState('');
  const [hIndex, setHIndex] = useState('');
  const [fundedProjects, setFundedProjects] = useState('');
  const [patents, setPatents] = useState('');
  
  // Intro/Conclusion data
  const [highlights, setHighlights] = useState('');
  const [achievements, setAchievements] = useState('');
  const [challenges, setChallenges] = useState('');
  const [futurePlans, setFuturePlans] = useState('');
  
  const handleGenerate = async () => {
    setLoading(true);
    setResult('');
    setStats(null);
    
    try {
      let response;
      
      switch (type) {
        case 'intro':
          response = await api.ai.generateIntro({
            highlights: highlights.split('\n').filter(h => h.trim()),
            model,
          });
          break;
        
        case 'research':
          response = await api.ai.generateResearch({
            publications_count: parseInt(publications) || 0,
            citations_count: parseInt(citations) || 0,
            h_index: parseInt(hIndex) || 0,
            funded_projects: parseInt(fundedProjects) || 0,
            patents: parseInt(patents) || 0,
            model,
          });
          break;
        
        case 'conclusion':
          response = await api.ai.generateConclusion({
            key_achievements: achievements.split('\n').filter(a => a.trim()),
            challenges: challenges.split('\n').filter(c => c.trim()),
            future_plans: futurePlans.split('\n').filter(p => p.trim()),
            model,
          });
          break;
        
        default:
          response = await api.ai.generate({
            section_title: sectionTitle,
            prompt,
            word_count: wordCount,
            model,
          });
      }
      
      setResult(response.content || '');
      setStats({
        tokens: response.total_tokens,
        cost: response.cost,
        duration: response.duration_ms,
        model: response.model,
      });
    } catch (error: any) {
      setResult(`خطأ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    alert('تم نسخ النص');
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">توليد المحتوى بالـ AI</h1>
        <p className="text-gray-600 mt-1">أنشئ محتوى التقارير باستخدام الذكاء الاصطناعي</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          {/* Model selection */}
          <div className="card">
            <label className="label mb-3">اختر المحرك</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'gemini', label: 'Gemini', desc: 'مجاني', icon: '🌟' },
                { value: 'cli', label: 'Claude CLI', desc: 'Pro مجاني', icon: '🤖' },
                { value: 'claude', label: 'Claude API', desc: 'مدفوع', icon: '💎' },
              ].map(m => (
                <button
                  key={m.value}
                  onClick={() => setModel(m.value as AIModel)}
                  className={`p-4 rounded-lg text-center transition-all ${
                    model === m.value
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <span className="text-2xl block mb-1">{m.icon}</span>
                  <span className="font-medium block">{m.label}</span>
                  <span className="text-xs text-gray-500">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Type selection */}
          <div className="card">
            <label className="label mb-3">نوع المحتوى</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'custom', label: 'نص مخصص' },
                { value: 'intro', label: 'المقدمة' },
                { value: 'research', label: 'البحث العلمي' },
                { value: 'conclusion', label: 'الخاتمة' },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value as GenerationType)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    type === t.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Dynamic form based on type */}
          <div className="card">
            {type === 'custom' && (
              <div className="space-y-4">
                <div>
                  <label className="label">عنوان القسم</label>
                  <input
                    type="text"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    className="input"
                    placeholder="مثال: البحث العلمي والابتكار"
                  />
                </div>
                <div>
                  <label className="label">التعليمات (Prompt)</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="input min-h-[150px]"
                    placeholder="اكتب التعليمات للـ AI..."
                  />
                </div>
                <div>
                  <label className="label">عدد الكلمات المطلوب</label>
                  <input
                    type="number"
                    value={wordCount}
                    onChange={(e) => setWordCount(parseInt(e.target.value) || 500)}
                    className="input w-32"
                    min={100}
                    max={2000}
                  />
                </div>
              </div>
            )}
            
            {type === 'intro' && (
              <div className="space-y-4">
                <div>
                  <label className="label">أبرز الإنجازات (سطر لكل إنجاز)</label>
                  <textarea
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    className="input min-h-[150px]"
                    placeholder="حصول الجامعة على الاعتماد الدولي&#10;افتتاح كلية جديدة&#10;زيادة عدد المنشورات البحثية"
                  />
                </div>
              </div>
            )}
            
            {type === 'research' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">عدد المنشورات (Scopus)</label>
                    <input
                      type="number"
                      value={publications}
                      onChange={(e) => setPublications(e.target.value)}
                      className="input"
                      placeholder="125"
                    />
                  </div>
                  <div>
                    <label className="label">عدد الاقتباسات</label>
                    <input
                      type="number"
                      value={citations}
                      onChange={(e) => setCitations(e.target.value)}
                      className="input"
                      placeholder="850"
                    />
                  </div>
                  <div>
                    <label className="label">H-Index</label>
                    <input
                      type="number"
                      value={hIndex}
                      onChange={(e) => setHIndex(e.target.value)}
                      className="input"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="label">المشاريع الممولة</label>
                    <input
                      type="number"
                      value={fundedProjects}
                      onChange={(e) => setFundedProjects(e.target.value)}
                      className="input"
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <label className="label">براءات الاختراع</label>
                    <input
                      type="number"
                      value={patents}
                      onChange={(e) => setPatents(e.target.value)}
                      className="input"
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {type === 'conclusion' && (
              <div className="space-y-4">
                <div>
                  <label className="label">أبرز الإنجازات</label>
                  <textarea
                    value={achievements}
                    onChange={(e) => setAchievements(e.target.value)}
                    className="input min-h-[100px]"
                    placeholder="سطر لكل إنجاز..."
                  />
                </div>
                <div>
                  <label className="label">التحديات</label>
                  <textarea
                    value={challenges}
                    onChange={(e) => setChallenges(e.target.value)}
                    className="input min-h-[100px]"
                    placeholder="سطر لكل تحدي..."
                  />
                </div>
                <div>
                  <label className="label">الخطط المستقبلية</label>
                  <textarea
                    value={futurePlans}
                    onChange={(e) => setFuturePlans(e.target.value)}
                    className="input min-h-[100px]"
                    placeholder="سطر لكل خطة..."
                  />
                </div>
              </div>
            )}
            
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn btn-primary w-full mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جاري التوليد...
                </span>
              ) : (
                '🤖 توليد المحتوى'
              )}
            </button>
          </div>
        </div>
        
        {/* Output */}
        <div className="space-y-4">
          <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-gray-900">النتيجة</h2>
              {result && (
                <button onClick={copyToClipboard} className="btn btn-secondary text-sm">
                  📋 نسخ
                </button>
              )}
            </div>
            
            {stats && (
              <div className="flex flex-wrap gap-3 mb-4 text-sm">
                <span className="badge badge-info">{stats.model}</span>
                <span className="badge badge-gray">{stats.tokens} tokens</span>
                <span className="badge badge-gray">{(stats.duration / 1000).toFixed(1)}s</span>
                {stats.cost > 0 && (
                  <span className="badge badge-warning">${stats.cost.toFixed(4)}</span>
                )}
                {stats.cost === 0 && (
                  <span className="badge badge-success">مجاني ✓</span>
                )}
              </div>
            )}
            
            <div className="flex-1 bg-gray-50 rounded-lg p-4 min-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>جاري التوليد...</p>
                    <p className="text-sm mt-2">قد يستغرق هذا بضع ثوانٍ</p>
                  </div>
                </div>
              ) : result ? (
                <div className="prose prose-sm max-w-none" dir="rtl">
                  <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                    {result}
                  </pre>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-4xl mb-4">🤖</p>
                    <p>اختر نوع المحتوى واضغط توليد</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
