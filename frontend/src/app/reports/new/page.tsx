'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

interface Template {
  id: number;
  name: string;
  description: string;
  sections_count: number;
}

interface Organization {
  id: number;
  name: string;
}

export default function NewReportPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    organization: '',
    template: '',
    period_start: '',
    period_end: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, orgsRes] = await Promise.all([
        fetch('http://localhost:8001/api/templates/'),
        fetch('http://localhost:8001/api/organizations/'),
      ]);

      const templatesData = await templatesRes.json();
      const orgsData = await orgsRes.json();

      setTemplates(templatesData.results || templatesData || []);
      setOrganizations(orgsData.results || orgsData || []);
    } catch (err) {
      console.error(err);
      setError('تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:8001/api/reports/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          organization: parseInt(formData.organization),
          template: parseInt(formData.template),
          period_start: formData.period_start,
          period_end: formData.period_end,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'فشل إنشاء التقرير');
      }

      const report = await res.json();
      router.push(`/reports/${report.id}`);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => router.push('/')}
            className="p-2 text-gray-400 hover:text-gray-600 ml-4"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">تقرير جديد</h1>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              عنوان التقرير *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="التقرير السنوي 2023-2024"
            />
          </div>

          {/* Organization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المؤسسة *
            </label>
            <select
              required
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">اختر المؤسسة</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              القالب *
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${
                    formData.template === String(template.id)
                      ? 'border-blue-500 ring-2 ring-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={formData.template === String(template.id)}
                    onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                    className="sr-only"
                  />
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <span className="flex items-center">
                        <DocumentDuplicateIcon className="h-5 w-5 text-gray-400 ml-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {template.name}
                        </span>
                      </span>
                      <span className="mt-1 text-xs text-gray-500">
                        {template.description}
                      </span>
                      <span className="mt-2 text-xs text-blue-600">
                        {template.sections_count} أقسام
                      </span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {templates.length === 0 && (
              <p className="text-gray-500 text-sm mt-2">
                لا توجد قوالب متاحة. أنشئ قالباً أولاً.
              </p>
            )}
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                بداية الفترة *
              </label>
              <input
                type="date"
                required
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نهاية الفترة *
              </label>
              <input
                type="date"
                required
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.template}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
