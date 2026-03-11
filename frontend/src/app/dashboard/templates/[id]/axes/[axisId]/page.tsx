'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Axis {
  id: number;
  code: string;
  name: string;
  description: string;
  order: number;
  template: number;
}

interface Item {
  id: number;
  code: string;
  name: string;
  description: string;
  field_type: string;
  order: number;
  axis: number;
}

export default function AxisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const axisId = params.axisId as string;

  const [axis, setAxis] = useState<Axis | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });

  useEffect(() => {
    loadData();
  }, [axisId]);

  async function loadData() {
    try {
      const axisData = await api.axes.get(parseInt(axisId));
      setAxis(axisData);
      setFormData({
        name: axisData.name,
        code: axisData.code,
        description: axisData.description || '',
      });

      const itemsData = await api.axes.items(parseInt(axisId));
      setItems(itemsData.results || itemsData || []);
    } catch (error) {
      console.error('Failed to load axis:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      await api.axes.update(parseInt(axisId), formData);
      setEditing(false);
      loadData();
    } catch (error) {
      console.error('Failed to update axis:', error);
    }
  }

  async function handleDelete() {
    if (!confirm('هل أنت متأكد من حذف هذا المحور؟')) return;
    try {
      await api.axes.delete(parseInt(axisId));
      router.push(`/dashboard/templates/${templateId}`);
    } catch (error) {
      console.error('Failed to delete axis:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!axis) {
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">المحور غير موجود</h3>
        <Link href={`/dashboard/templates/${templateId}`} className="btn btn-primary mt-4">
          العودة للقالب
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/templates" className="hover:text-blue-600">القوالب</Link>
        <span>/</span>
        <Link href={`/dashboard/templates/${templateId}`} className="hover:text-blue-600">القالب</Link>
        <span>/</span>
        <span className="text-gray-900">{axis.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>📊</span>
            <span>{editing ? 'تعديل المحور' : axis.name}</span>
          </h1>
          <p className="text-gray-500 mt-1">
            الكود: {axis.code} • {items.length} بند
          </p>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <>
              <button onClick={() => setEditing(true)} className="btn btn-secondary">
                ✏️ تعديل
              </button>
              <button onClick={handleDelete} className="btn bg-red-100 text-red-700 hover:bg-red-200">
                🗑️ حذف
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editing ? (
        <div className="card space-y-4">
          <div>
            <label className="label">اسم المحور</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">الكود</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn btn-primary">💾 حفظ</button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary">إلغاء</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-2">الوصف</h3>
          <p className="text-gray-600">{axis.description || 'لا يوجد وصف'}</p>
        </div>
      )}

      {/* Items List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">البنود ({items.length})</h2>
          <Link
            href={`/dashboard/templates/structure?axis=${axisId}`}
            className="btn btn-primary text-sm"
          >
            ➕ إضافة بند
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>لا توجد بنود في هذا المحور</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">
                      {item.code} • {item.field_type}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/templates/items/${item.id}/components`}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  🧩 المكونات
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
