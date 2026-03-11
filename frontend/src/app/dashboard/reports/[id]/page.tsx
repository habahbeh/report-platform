'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Section {
  id: number;
  title: string;
  order: number;
  content: string;
  status: string;
  status_display: string;
}

interface Report {
  id: number;
  title: string;
  status: string;
  status_display: string;
  period_start: string;
  period_end: string;
  period_display: string;
  progress: number;
  sections: Section[];
}

export default function ReportEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  
  useEffect(() => {
    loadReport();
  }, [resolvedParams.id]);
  
  const loadReport = async () => {
    try {
      const data = await api.reports.get(parseInt(resolvedParams.id));
      setReport(data);
      if (data.sections?.length > 0) {
        setActiveSection(data.sections[0].id);
        setEditContent(data.sections[0].content || '');
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      router.push('/dashboard/reports');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSectionClick = (section: Section) => {
    setActiveSection(section.id);
    setEditContent(section.content || '');
    setSaveStatus('saved');
  };
  
  const handleContentChange = (value: string) => {
    setEditContent(value);
    setSaveStatus('unsaved');
  };
  
  const handleSaveContent = async () => {
    if (!activeSection) return;
    
    setSaveStatus('saving');
    try {
      await api.reports.sections.update(activeSection, { content: editContent });
      
      // Update local state
      setReport(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === activeSection ? { ...s, content: editContent, status: 'edited' } : s
          ),
        };
      });
      
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('unsaved');
      alert('فشل في الحفظ');
    }
  };
  
  const handleGenerateSection = async (sectionId: number) => {
    setGenerating(true);
    try {
      await api.reports.sections.generate(sectionId);
      
      // Poll for completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const statusData = await api.reports.status(parseInt(resolvedParams.id));
        const section = statusData.sections?.find((s: Section) => s.id === sectionId);
        
        if (section?.status === 'generated' || section?.status === 'edited' || attempts > 30) {
          clearInterval(poll);
          setGenerating(false);
          loadReport();
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to generate:', error);
      alert('فشل في توليد القسم');
      setGenerating(false);
    }
  };
  
  const handleGenerateAll = async () => {
    if (!confirm('سيتم توليد جميع الأقسام. هل تريد المتابعة؟')) return;
    
    setGenerating(true);
    try {
      await api.reports.generate(parseInt(resolvedParams.id));
      
      // Poll for completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const statusData = await api.reports.status(parseInt(resolvedParams.id));
        
        if (statusData.status === 'review' || statusData.status === 'approved' || attempts > 60) {
          clearInterval(poll);
          setGenerating(false);
          loadReport();
        }
      }, 3000);
    } catch (error) {
      console.error('Failed to generate all:', error);
      alert('فشل في توليد التقرير');
      setGenerating(false);
    }
  };
  
  const handleExport = async (format: 'docx' | 'pdf') => {
    setExporting(true);
    try {
      const response = await fetch(`http://localhost:8001/api/export/${resolvedParams.id}/export/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report?.title || 'report'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('فشل في التصدير');
    } finally {
      setExporting(false);
    }
  };
  
  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    ready: 'bg-blue-100 text-blue-600',
    generating: 'bg-yellow-100 text-yellow-600',
    generated: 'bg-green-100 text-green-600',
    edited: 'bg-purple-100 text-purple-600',
    approved: 'bg-green-100 text-green-600',
  };
  
  const statusIcons: Record<string, string> = {
    pending: '○',
    ready: '◐',
    generating: '⏳',
    generated: '✓',
    edited: '✎',
    approved: '✓',
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">التقرير غير موجود</p>
        <Link href="/dashboard/reports" className="text-blue-600 hover:underline">
          العودة للتقارير
        </Link>
      </div>
    );
  }
  
  const activeSectionData = report.sections.find(s => s.id === activeSection);
  
  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
          <Link href="/dashboard/reports" className="text-gray-500 hover:text-gray-700 text-sm mb-1 inline-block">
            ← العودة للتقارير
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{report.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-500">{report.period_display}</span>
            <span className={`badge ${statusColors[report.status] || 'badge-gray'}`}>
              {report.status_display}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Progress */}
          <div className="hidden sm:flex items-center gap-2 px-4">
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${report.progress}%` }}
              />
            </div>
            <span className="text-sm text-gray-500">{report.progress}%</span>
          </div>
          
          {/* Actions */}
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="btn btn-secondary text-sm"
          >
            {generating ? '⏳ جاري التوليد...' : '🤖 توليد الكل'}
          </button>
          
          <div className="relative group">
            <button className="btn btn-primary text-sm" disabled={exporting}>
              {exporting ? '⏳ جاري التصدير...' : '📥 تصدير'}
            </button>
            <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('docx')}
                className="block w-full px-4 py-2 text-right hover:bg-gray-50 rounded-t-lg"
              >
                📄 Word (.docx)
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="block w-full px-4 py-2 text-right hover:bg-gray-50 rounded-b-lg"
              >
                📕 PDF
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex gap-4 h-[calc(100%-4rem)]">
        {/* Sections sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="card h-full overflow-y-auto scrollbar-thin">
            <h3 className="font-medium text-gray-900 mb-3">الأقسام</h3>
            <div className="space-y-1">
              {report.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-right transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${statusColors[section.status]}`}>
                    {statusIcons[section.status]}
                  </span>
                  <span className="flex-1 truncate text-sm">{section.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Content editor */}
        <div className="flex-1 card flex flex-col">
          {activeSectionData ? (
            <>
              {/* Section header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900">{activeSectionData.title}</h2>
                  <span className={`badge text-xs ${statusColors[activeSectionData.status]}`}>
                    {activeSectionData.status_display}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {saveStatus === 'unsaved' && (
                    <span className="text-xs text-yellow-600">تغييرات غير محفوظة</span>
                  )}
                  {saveStatus === 'saving' && (
                    <span className="text-xs text-blue-600">جاري الحفظ...</span>
                  )}
                  {saveStatus === 'saved' && editContent && (
                    <span className="text-xs text-green-600">✓ محفوظ</span>
                  )}
                  
                  <button
                    onClick={() => handleGenerateSection(activeSectionData.id)}
                    disabled={generating}
                    className="btn btn-secondary text-xs"
                  >
                    {generating ? '⏳' : '🤖'} {activeSectionData.content ? 'إعادة توليد' : 'توليد'}
                  </button>
                  
                  {saveStatus === 'unsaved' && (
                    <button onClick={handleSaveContent} className="btn btn-success text-xs">
                      💾 حفظ
                    </button>
                  )}
                </div>
              </div>
              
              {/* Editor */}
              <div className="flex-1 pt-4">
                {editContent || activeSectionData.content ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full h-full p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800 leading-relaxed"
                    placeholder="محتوى القسم..."
                    dir="rtl"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <p className="text-4xl mb-4">📝</p>
                    <p className="mb-4">لم يتم توليد المحتوى بعد</p>
                    <button
                      onClick={() => handleGenerateSection(activeSectionData.id)}
                      disabled={generating}
                      className="btn btn-primary"
                    >
                      {generating ? '⏳ جاري التوليد...' : '🤖 توليد المحتوى'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>اختر قسماً للتعديل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
