'use client';

import { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';

interface TemplateSection {
  id: number;
  title: string;
  order: number;
  section_type: string;
}

interface Template {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  sections_count: number;
  sections?: TemplateSection[];
  created_at: string;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/templates/');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTemplates(data.results || data);
    } catch (err) {
      setError('تعذر تحميل القوالب');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateDetails = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8001/api/templates/${id}/`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSelectedTemplate(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">القوالب</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center">
          <PlusIcon className="h-5 w-5 ml-2" />
          قالب جديد
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">قائمة القوالب</h3>
            </div>
            {templates.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                لا توجد قوالب
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    onClick={() => fetchTemplateDetails(template.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedTemplate?.id === template.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{template.name}</p>
                        <p className="text-sm text-gray-500">
                          {template.sections_count} أقسام
                        </p>
                      </div>
                      {template.is_default && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          افتراضي
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Template Details */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedTemplate.name}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600" title="تعديل">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600" title="نسخ">
                    <DocumentDuplicateIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="font-medium text-gray-900 mb-4">الأقسام</h3>
                {selectedTemplate.sections && selectedTemplate.sections.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedTemplate.sections.map((section, index) => (
                      <li
                        key={section.id}
                        className="flex items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-sm font-medium ml-3">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{section.title}</p>
                          <p className="text-xs text-gray-500">{section.section_type}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">جاري تحميل الأقسام...</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <DocumentDuplicateIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>اختر قالباً لعرض تفاصيله</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
