'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowRightIcon, 
  SparklesIcon, 
  CheckCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon 
} from '@heroicons/react/24/outline';

interface Section {
  id: number;
  title: string;
  order: number;
  status: string;
  status_display: string;
  content: string;
}

interface Report {
  id: number;
  title: string;
  status: string;
  status_display: string;
  progress: number;
  period_display: string;
  sections: Section[];
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  useEffect(() => {
    fetchReport();
  }, [params.id]);

  const fetchReport = async () => {
    try {
      const res = await fetch(`http://localhost:8001/api/reports/${params.id}/`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setReport(data);
      if (data.sections?.length > 0) {
        setSelectedSection(data.sections[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateSection = async (sectionId: number, sectionType: string) => {
    setGenerating(sectionId);
    
    try {
      // Determine section type for AI
      let aiSectionType = 'introduction';
      if (sectionType.includes('البحث العلمي')) {
        aiSectionType = 'research';
      } else if (sectionType.includes('الخاتمة')) {
        aiSectionType = 'conclusion';
      }

      const res = await fetch('http://localhost:8001/api/ai/generate/test/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_type: aiSectionType }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Update section content
        await fetch(`http://localhost:8001/api/reports/${params.id}/sections/${sectionId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: data.content,
            status: 'generated'
          }),
        });
        
        // Refresh report
        fetchReport();
      } else {
        alert('فشل التوليد: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التوليد');
    } finally {
      setGenerating(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generated':
      case 'edited':
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'generating':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">التقرير غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-400 hover:text-gray-600 ml-4"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{report.title}</h1>
              <p className="text-sm text-gray-500">{report.period_display}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 ml-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${report.progress}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">{report.progress}%</span>
            </div>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center">
              <ArrowDownTrayIcon className="h-5 w-5 ml-2" />
              تصدير Word
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sections List */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">الأقسام</h2>
                <button
                  onClick={() => {
                    report.sections.forEach(s => {
                      if (s.status === 'pending') {
                        generateSection(s.id, s.title);
                      }
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <SparklesIcon className="h-4 w-4 ml-1" />
                  توليد الكل
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {report.sections.map((section) => (
                  <li
                    key={section.id}
                    onClick={() => setSelectedSection(section)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 flex items-center ${
                      selectedSection?.id === section.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="ml-3">
                      {generating === section.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                      ) : (
                        getStatusIcon(section.status)
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{section.title}</p>
                      <p className="text-xs text-gray-500">{section.status_display}</p>
                    </div>
                    {section.status === 'pending' && generating !== section.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateSection(section.id, section.title);
                        }}
                        className="p-1 text-yellow-500 hover:text-yellow-600"
                        title="توليد"
                      >
                        <SparklesIcon className="h-5 w-5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Content Editor */}
          <div className="flex-1">
            {selectedSection ? (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedSection.title}
                  </h2>
                  <div className="flex gap-2">
                    {selectedSection.status === 'pending' && (
                      <button
                        onClick={() => generateSection(selectedSection.id, selectedSection.title)}
                        disabled={generating === selectedSection.id}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 flex items-center disabled:opacity-50"
                      >
                        {generating === selectedSection.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                            جاري التوليد...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-5 w-5 ml-2" />
                            توليد بالذكاء الاصطناعي
                          </>
                        )}
                      </button>
                    )}
                    {selectedSection.content && (
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                        حفظ التعديلات
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {selectedSection.content ? (
                    <div 
                      className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
                      style={{ direction: 'rtl' }}
                    >
                      {selectedSection.content.split('\n').map((paragraph, idx) => (
                        <p key={idx} className="mb-4">{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">لم يتم توليد المحتوى بعد</p>
                      <button
                        onClick={() => generateSection(selectedSection.id, selectedSection.title)}
                        disabled={generating === selectedSection.id}
                        className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-600"
                      >
                        <SparklesIcon className="h-5 w-5 inline ml-2" />
                        توليد المحتوى
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                اختر قسماً لعرض محتواه
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
