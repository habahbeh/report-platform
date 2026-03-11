'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function NewAxisPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.axes.create({
        ...formData,
        template: parseInt(templateId),
      });
      router.push(`/dashboard/templates/${templateId}`);
    } catch (error) {
      console.error('Failed to create axis:', error);
      alert('فشل في إنشاء المحور');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/templates" className="hover:text-blue-600">القوالب</Link>
        <span>/</span>
        <Link href={`/dashboard/templates/${templateId}`} className="hover:text-blue-600">القالب</Link>
        <span>/</span>
        <span className="text-gray-900">محور جديد</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span>➕</span>
          <span>إضافة محور جديد</span>
        </h1>
        <p className="text-gray-500 mt-1">
          أضف محوراً جديداً للقالب
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-6 max-w-2xl">
        <div>
          <label className="label">اسم المحور *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="مثال: المحور الأول - البحث العلمي"
            required
          />
        </div>

        <div>
          <label className="label">الكود *</label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="input"
            placeholder="مثال: AX01"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            كود فريد للمحور (يُستخدم في الاستيراد والتصدير)
          </p>
        </div>

        <div>
          <label className="label">الوصف</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={4}
            placeholder="وصف مختصر للمحور..."
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? '⏳ جاري الإنشاء...' : '✅ إنشاء المحور'}
          </button>
          <Link
            href={`/dashboard/templates/${templateId}`}
            className="btn btn-secondary"
          >
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  );
}
