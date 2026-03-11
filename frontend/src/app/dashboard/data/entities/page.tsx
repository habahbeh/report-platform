'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Entity {
  id: number;
  name: string;
  name_en: string;
  contact_role: string;
  priority: string;
  is_college: boolean;
  items_count: number;
  notes: string;
}

interface Item {
  id: number;
  code: string;
  name: string;
  name_en: string;
  field_type: string;
  axis_name: string;
  required: boolean;
}

interface Template {
  id: number;
  name: string;
}

export default function EntitiesManagementPage() {
  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityItems, setEntityItems] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateData();
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      const res = await api.templates.list();
      const templatesList = res.results || res || [];
      setTemplates(templatesList);
      if (templatesList.length > 0) {
        setSelectedTemplate(templatesList[0].id);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadTemplateData = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      const [entitiesRes, itemsRes] = await Promise.all([
        api.entities.list(selectedTemplate),
        api.items.list({ template: selectedTemplate }),
      ]);
      setEntities(entitiesRes.results || entitiesRes || []);
      setAllItems(itemsRes.results || itemsRes || []);
    } catch (error) {
      console.error('Failed to load template data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEntityModal = async (entity: Entity) => {
    setSelectedEntity(entity);
    setShowModal(true);
    try {
      const itemsRes = await api.entities.items(entity.id);
      const items = itemsRes.results || itemsRes || [];
      setEntityItems(items.map((item: any) => item.id));
    } catch (error) {
      console.error('Failed to load entity items:', error);
      setEntityItems([]);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEntity(null);
    setEntityItems([]);
  };

  const toggleItem = (itemId: number) => {
    setEntityItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const saveEntityItems = async () => {
    if (!selectedEntity) return;
    setSaving(true);
    try {
      await api.entities.update(selectedEntity.id, { items: entityItems });
      await loadTemplateData();
      closeModal();
    } catch (error) {
      alert('فشل في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const selectAllItems = () => {
    setEntityItems(allItems.map((item) => item.id));
  };

  const deselectAllItems = () => {
    setEntityItems([]);
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      critical: 'حرج',
      high: 'عالي',
      medium: 'متوسط',
      low: 'منخفض',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[priority] || styles.medium}`}>
        {labels[priority] || priority}
      </span>
    );
  };

  // Group items by axis
  const itemsByAxis = allItems.reduce((acc, item) => {
    const axis = item.axis_name || 'عام';
    if (!acc[axis]) acc[axis] = [];
    acc[axis].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/data" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← العودة لجمع البيانات
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">🏢 إدارة الجهات</h1>
          <p className="text-gray-600 mt-1">ربط البنود بالجهات المسؤولة عنها</p>
        </div>

        {/* Template Selector */}
        {templates.length > 0 && (
          <select
            value={selectedTemplate || ''}
            onChange={(e) => setSelectedTemplate(Number(e.target.value))}
            className="input w-64"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{entities.length}</p>
          <p className="text-sm text-gray-600">جهة</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{allItems.length}</p>
          <p className="text-sm text-gray-600">بند</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-600">
            {entities.filter((e) => e.items_count > 0).length}
          </p>
          <p className="text-sm text-gray-600">جهة مرتبطة</p>
        </div>
      </div>

      {/* Entities Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((entity) => (
            <div
              key={entity.id}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openEntityModal(entity)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{entity.name}</h3>
                    {entity.is_college && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        كلية
                      </span>
                    )}
                  </div>
                  {entity.contact_role && (
                    <p className="text-sm text-gray-500 mt-1">{entity.contact_role}</p>
                  )}
                </div>
                {getPriorityBadge(entity.priority)}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-600">{entity.items_count}</span>
                  <span className="text-sm text-gray-500">بند</span>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  ✏️ تعديل البنود
                </button>
              </div>

              {entity.items_count === 0 && (
                <p className="text-xs text-orange-500 mt-2">⚠️ لم يتم ربط أي بنود</p>
              )}
            </div>
          ))}
        </div>
      )}

      {entities.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">🏢</p>
          <p>لا توجد جهات في هذا القالب</p>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && selectedEntity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  🏢 {selectedEntity.name}
                </h2>
                <p className="text-sm text-gray-500">اختر البنود المسؤولة عنها هذه الجهة</p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Quick Actions */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={selectAllItems}
                  className="text-sm text-blue-600 hover:underline"
                >
                  اختيار الكل
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAllItems}
                  className="text-sm text-blue-600 hover:underline"
                >
                  إلغاء الكل
                </button>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">
                  {entityItems.length} بند محدد
                </span>
              </div>

              {/* Items by Axis */}
              {Object.entries(itemsByAxis).map(([axisName, items]) => (
                <div key={axisName} className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2 pb-1 border-b">
                    📁 {axisName}
                  </h4>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                          entityItems.includes(item.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={entityItems.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="w-4 h-4"
                        />
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.code}
                        </span>
                        <span className="flex-1">{item.name}</span>
                        <span className="text-xs text-gray-400">{item.field_type}</span>
                        {item.required && (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {entityItems.length} من {allItems.length} بند
              </p>
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  إلغاء
                </button>
                <button
                  onClick={saveEntityItems}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : '💾 حفظ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
