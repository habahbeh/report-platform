'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Template {
  id: number;
  name: string;
  description: string;
  sections_count: number;
}

export default function NewReportPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [title, setTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  
  useEffect(() => {
    api.templates.list()
      .then(data => {
        const list = data.results || data || [];
        setTemplates(list);
        if (list.length > 0) {
          setSelectedTemplate(list[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTemplate) {
      setError('يرجى اختيار قالب');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const data = await api.reports.create({
        title,
        template: selectedTemplate,
        period_start: periodStart,
        period_end: periodEnd,
      });
      
      router.push(`/dashboard/reports/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'فشل في إنشاء التقرير');
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/reports" className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-block">
          ← العودة للتقارير
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">إنشاء تقرير جديد</h1>
        <p className="text-gray-600 mt-1">اختر قالباً وحدد تفاصيل التقرير</p>
      </div>
      
      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="card">
          <label className="label">عنوان التقرير</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="مثال: التقرير السنوي 2023-2024"
            required
          />
        </div>
        
        {/* Template selection */}
        <div className="card">
          <label className="label mb-3">اختر القالب</label>
          
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>لا توجد قوالب متاحة</p>
              <Link href="/dashboard/templates/new" className="text-blue-600 hover:underline text-sm">
                أنشئ قالباً جديداً
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={() => setSelectedTemplate(template.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{template.name}</p>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {template.sections_count} أقسام
                    </p>
                  </div>
                  <span className="text-2xl">📋</span>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* Period */}
        <div className="card">
          <label className="label mb-3">فترة التقرير</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">من تاريخ</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">إلى تاريخ</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !selectedTemplate}
            className="btn btn-primary flex-1"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                جاري الإنشاء...
              </span>
            ) : (
              'إنشاء التقرير'
            )}
          </button>
          <Link href="/dashboard/reports" className="btn btn-secondary">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  );
}
