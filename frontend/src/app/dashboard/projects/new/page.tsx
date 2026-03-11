'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Template {
  id: number;
  name: string;
  name_en: string;
  description: string;
  category: string;
  axes_count: number;
  items_count: number;
  entities_count: number;
}

interface Organization {
  id: number;
  name: string;
  name_en: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplate = searchParams.get('template');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    template: preselectedTemplate ? parseInt(preselectedTemplate) : 0,
    organization: 0,
    period: '',
    period_start: '',
    period_end: '',
    deadline: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-generate name when template and period are selected
    if (formData.template && formData.period) {
      const template = templates.find(t => t.id === formData.template);
      if (template && !formData.name) {
        setFormData(prev => ({
          ...prev,
          name: `${template.name} ${formData.period}`
        }));
      }
    }
  }, [formData.template, formData.period, templates]);

  async function loadData() {
    try {
      const [templatesData, orgsData] = await Promise.all([
        api.templates.list().catch(() => ({ results: [] })),
        api.organizations.list().catch(() => ({ results: [] })),
      ]);

      setTemplates(templatesData.results || templatesData || []);
      setOrganizations(orgsData.results || orgsData || []);

      // If there's a preselected template, skip to step 2
      if (preselectedTemplate) {
        setStep(2);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const project = await api.projects.create({
        name: formData.name,
        template: formData.template,
        organization: formData.organization || undefined,
        period: formData.period,
        period_start: formData.period_start,
        period_end: formData.period_end,
        deadline: formData.deadline || undefined,
      });

      router.push(`/dashboard/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء المشروع');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTemplate = templates.find(t => t.id === formData.template);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard/projects" className="hover:text-gray-700">المشاريع</Link>
        <span>←</span>
        <span className="text-gray-900">مشروع جديد</span>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[
          { num: 1, label: 'اختر القالب' },
          { num: 2, label: 'تفاصيل المشروع' },
          { num: 3, label: 'مراجعة وإنشاء' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                step >= s.num
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </div>
            <span className={`mx-2 text-sm ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {i < 2 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Choose Template */}
        {step === 1 && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">اختر القالب</h2>
            <p className="text-gray-600 mb-6">اختر قالب التقرير الذي تريد استخدامه</p>

            {templates.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-gray-500">لا توجد قوالب متاحة</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, template: template.id }));
                      setStep(2);
                    }}
                    className={`p-4 rounded-xl border-2 text-right transition-all hover:shadow-md ${
                      formData.template === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">{template.name}</div>
                    {template.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>{template.axes_count} محور</span>
                      <span>{template.items_count} بند</span>
                      <span>{template.entities_count} جهة</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Project Details */}
        {step === 2 && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">تفاصيل المشروع</h2>

            {selectedTemplate && (
              <div className="p-3 bg-blue-50 rounded-lg mb-6 flex items-center justify-between">
                <div>
                  <span className="text-sm text-blue-600">القالب المختار:</span>
                  <span className="font-medium text-gray-900 mr-2">{selectedTemplate.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  تغيير
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">اسم المشروع *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="مثال: التقرير السنوي 2024-2025"
                  required
                />
              </div>

              <div>
                <label className="label">المؤسسة</label>
                <select
                  value={formData.organization}
                  onChange={(e) => setFormData(prev => ({ ...prev, organization: parseInt(e.target.value) }))}
                  className="input"
                >
                  <option value="0">اختر المؤسسة (اختياري)</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">الفترة *</label>
                  <input
                    type="text"
                    value={formData.period}
                    onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                    className="input"
                    placeholder="2024-2025"
                    required
                  />
                </div>
                <div>
                  <label className="label">الموعد النهائي</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">بداية الفترة *</label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">نهاية الفترة *</label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6 pt-6 border-t">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
              >
                ← السابق
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!formData.name || !formData.period || !formData.period_start || !formData.period_end}
                className="btn btn-primary"
              >
                التالي →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">مراجعة وإنشاء</h2>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">ملخص المشروع</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">اسم المشروع</dt>
                    <dd className="font-medium">{formData.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">القالب</dt>
                    <dd className="font-medium">{selectedTemplate?.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">الفترة</dt>
                    <dd className="font-medium">{formData.period}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">من - إلى</dt>
                    <dd className="font-medium">{formData.period_start} → {formData.period_end}</dd>
                  </div>
                  {formData.deadline && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">الموعد النهائي</dt>
                      <dd className="font-medium">{formData.deadline}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {selectedTemplate && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">ما سيتم إنشاؤه:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ {selectedTemplate.items_count} بند للإدخال</li>
                    <li>✓ {selectedTemplate.entities_count} جهة مسؤولة</li>
                    <li>✓ روابط إدخال لكل جهة</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-6 border-t">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-secondary"
              >
                ← السابق
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    جاري الإنشاء...
                  </span>
                ) : (
                  'إنشاء المشروع ✓'
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
