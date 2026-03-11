'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Item {
  id: number;
  code: string;
  name: string;
  axis_name: string;
}

interface ItemComponent {
  id: number;
  component_type: string;
  source: string;
  title: string;
  order: number;
  required: boolean;
  table_ref: number | null;
  chart_ref: number | null;
  config: Record<string, any>;
  notes: string;
}

const componentTypes = [
  { value: 'text', label: 'نص', icon: '📝', color: 'bg-gray-100' },
  { value: 'text_ai', label: 'نص (AI)', icon: '🤖', color: 'bg-purple-100' },
  { value: 'table', label: 'جدول', icon: '📊', color: 'bg-blue-100' },
  { value: 'chart', label: 'رسم بياني', icon: '📈', color: 'bg-green-100' },
  { value: 'image', label: 'صورة', icon: '🖼️', color: 'bg-yellow-100' },
  { value: 'divider', label: 'فاصل', icon: '➖', color: 'bg-gray-50' },
];

const sourceTypes = [
  { value: 'auto', label: 'تلقائي من البيانات' },
  { value: 'ai', label: 'توليد AI' },
  { value: 'manual', label: 'إدخال يدوي' },
  { value: 'reference', label: 'مرجع' },
];

export default function ItemComponentsPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;

  const [item, setItem] = useState<Item | null>(null);
  const [components, setComponents] = useState<ItemComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ItemComponent | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    component_type: 'text_ai',
    source: 'ai',
    title: '',
    required: true,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [itemId]);

  async function loadData() {
    try {
      const [itemData, componentsData] = await Promise.all([
        fetchAPI(`/templates/items/${itemId}/`),
        fetchAPI(`/templates/item-components/?item=${itemId}`),
      ]);
      setItem(itemData);
      setComponents(componentsData.results || componentsData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAPI(url: string, options?: RequestInit) {
    const res = await fetch(`http://localhost:8002/api${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error('API error');
    return res.json();
  }

  async function handleAddComponent() {
    try {
      const newOrder = components.length > 0 
        ? Math.max(...components.map(c => c.order)) + 1 
        : 0;
      
      await fetchAPI('/templates/item-components/', {
        method: 'POST',
        body: JSON.stringify({
          item: parseInt(itemId),
          ...formData,
          order: newOrder,
        }),
      });
      
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to add component:', error);
      alert('فشل في إضافة المكوّن');
    }
  }

  async function handleUpdateComponent() {
    if (!editingComponent) return;
    
    try {
      await fetchAPI(`/templates/item-components/${editingComponent.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      
      setEditingComponent(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to update component:', error);
      alert('فشل في تحديث المكوّن');
    }
  }

  async function handleDeleteComponent(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا المكوّن؟')) return;
    
    try {
      await fetchAPI(`/templates/item-components/${id}/`, {
        method: 'DELETE',
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete component:', error);
      alert('فشل في حذف المكوّن');
    }
  }

  async function handleMoveComponent(id: number, direction: 'up' | 'down') {
    const index = components.findIndex(c => c.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === components.length - 1)
    ) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newOrder = components[newIndex].order;
    const currentOrder = components[index].order;

    try {
      // Swap orders
      await Promise.all([
        fetchAPI(`/templates/item-components/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ order: newOrder }),
        }),
        fetchAPI(`/templates/item-components/${components[newIndex].id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ order: currentOrder }),
        }),
      ]);
      loadData();
    } catch (error) {
      console.error('Failed to reorder:', error);
    }
  }

  function resetForm() {
    setFormData({
      component_type: 'text_ai',
      source: 'ai',
      title: '',
      required: true,
      notes: '',
    });
  }

  function openEditModal(component: ItemComponent) {
    setEditingComponent(component);
    setFormData({
      component_type: component.component_type,
      source: component.source,
      title: component.title,
      required: component.required,
      notes: component.notes,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">البند غير موجود</h3>
        <Link href="/dashboard/templates/structure" className="text-blue-600 hover:underline">
          العودة للمحاور والبنود
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/templates" className="hover:text-blue-600">القوالب</Link>
        <span>←</span>
        <Link href="/dashboard/templates/structure" className="hover:text-blue-600">المحاور والبنود</Link>
        <span>←</span>
        <span className="text-gray-900">مكوّنات البند {item.code}</span>
      </div>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>🧩</span>
              <span>مكوّنات البند</span>
            </h1>
            <p className="text-lg text-blue-600 mt-2">{item.code}: {item.name}</p>
            <p className="text-gray-500 text-sm mt-1">المحور: {item.axis_name}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <span>➕</span>
            <span>إضافة مكوّن</span>
          </button>
        </div>
      </div>

      {/* Components List */}
      {components.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🧩</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد مكوّنات</h3>
          <p className="text-gray-500 mb-6">أضف المكوّنات لتحديد ترتيب محتوى البند</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            ➕ إضافة مكوّن
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {components.map((comp, index) => {
            const typeConfig = componentTypes.find(t => t.value === comp.component_type);
            const sourceConfig = sourceTypes.find(s => s.value === comp.source);
            
            return (
              <div
                key={comp.id}
                className={`card flex items-center gap-4 ${typeConfig?.color || 'bg-white'}`}
              >
                {/* Order Number */}
                <div className="text-2xl font-bold text-gray-300 w-8 text-center">
                  {index + 1}
                </div>

                {/* Icon & Type */}
                <div className="text-3xl">{typeConfig?.icon}</div>

                {/* Content */}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {typeConfig?.label}
                    {comp.title && <span className="text-gray-500"> — {comp.title}</span>}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                    <span>المصدر: {sourceConfig?.label}</span>
                    {comp.required && <span className="text-red-500">• مطلوب</span>}
                    {comp.notes && <span>• {comp.notes}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMoveComponent(comp.id, 'up')}
                    disabled={index === 0}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => handleMoveComponent(comp.id, 'down')}
                    disabled={index === components.length - 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => openEditModal(comp)}
                    className="p-2 text-blue-600 hover:text-blue-700"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteComponent(comp.id)}
                    className="p-2 text-red-600 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview */}
      <div className="card bg-gray-50">
        <h3 className="font-bold text-gray-900 mb-4">🔮 معاينة التقرير</h3>
        <div className="bg-white rounded-lg p-6 border">
          <h4 className="text-lg font-bold text-blue-800 mb-4">{item.code}: {item.name}</h4>
          {components.map((comp, index) => {
            const typeConfig = componentTypes.find(t => t.value === comp.component_type);
            return (
              <div key={comp.id} className="mb-4 last:mb-0">
                {comp.component_type === 'text' || comp.component_type === 'text_ai' ? (
                  <p className="text-gray-600 bg-gray-50 p-3 rounded border-r-4 border-purple-300">
                    [نص {comp.source === 'ai' ? 'سيُولّد بالذكاء الاصطناعي' : 'يدوي'}]
                  </p>
                ) : comp.component_type === 'table' ? (
                  <div className="bg-blue-50 p-4 rounded border-r-4 border-blue-400 text-center">
                    📊 جدول {comp.title || `(${index + 1})`}
                  </div>
                ) : comp.component_type === 'chart' ? (
                  <div className="bg-green-50 p-4 rounded border-r-4 border-green-400 text-center">
                    📈 رسم بياني {comp.title || `(${index + 1})`}
                  </div>
                ) : comp.component_type === 'image' ? (
                  <div className="bg-yellow-50 p-4 rounded border-r-4 border-yellow-400 text-center">
                    🖼️ صورة {comp.title || `(${index + 1})`}
                  </div>
                ) : (
                  <hr className="my-4" />
                )}
              </div>
            );
          })}
          {components.length === 0 && (
            <p className="text-gray-400 text-center">لم يتم تحديد مكوّنات بعد</p>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingComponent) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingComponent ? 'تعديل مكوّن' : 'إضافة مكوّن جديد'}
            </h2>

            <div className="space-y-4">
              {/* Component Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع المكوّن
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {componentTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFormData(prev => ({ ...prev, component_type: type.value }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.component_type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-sm">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مصدر المحتوى
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {sourceTypes.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العنوان (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="مثال: شكل (1-2) توزيع الإنتاج العلمي"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Required */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="required"
                  checked={formData.required}
                  onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="required" className="text-sm text-gray-700">
                  مكوّن مطلوب
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingComponent(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={editingComponent ? handleUpdateComponent : handleAddComponent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingComponent ? 'حفظ التعديلات' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
