'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Template {
  id: number;
  name: string;
}

interface Axis {
  id: number;
  template: number;
  code: string;
  name: string;
  description: string;
  order: number;
  items_count: number;
}

interface Item {
  id: number;
  axis: number;
  code: string;
  name: string;
  description: string;
  field_type: string;
  is_required: boolean;
  order: number;
}

const fieldTypes: Record<string, { label: string; icon: string }> = {
  text: { label: 'نص', icon: '📝' },
  number: { label: 'رقم', icon: '🔢' },
  percentage: { label: 'نسبة', icon: '📊' },
  currency: { label: 'مبلغ', icon: '💰' },
  date: { label: 'تاريخ', icon: '📅' },
  file: { label: 'ملف', icon: '📎' },
  select: { label: 'اختيار', icon: '📋' },
  multiselect: { label: 'اختيار متعدد', icon: '☑️' },
  textarea: { label: 'نص طويل', icon: '📄' },
};

export default function TemplateStructurePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [axes, setAxes] = useState<Axis[]>([]);
  const [selectedAxis, setSelectedAxis] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadAxes();
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedAxis) {
      loadItems();
    }
  }, [selectedAxis]);

  async function loadTemplates() {
    try {
      const data = await api.templates.list();
      const list = data.results || data || [];
      setTemplates(list);
      if (list.length > 0) {
        setSelectedTemplate(list[0].id);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAxes() {
    if (!selectedTemplate) return;
    try {
      const data = await api.axes.list(selectedTemplate);
      const list = data.results || data || [];
      setAxes(list);
      if (list.length > 0) {
        setSelectedAxis(list[0].id);
      } else {
        setSelectedAxis(null);
        setItems([]);
      }
    } catch (error) {
      console.error('Failed to load axes:', error);
    }
  }

  async function loadItems() {
    if (!selectedAxis) return;
    try {
      const data = await api.items.list({ axis: selectedAxis });
      setItems(data.results || data || []);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>🏗️</span>
            <span>المحاور والبنود</span>
          </h1>
          <p className="text-gray-500 mt-1">
            إدارة هيكل القالب (المحاور وبنود البيانات)
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد قوالب</h3>
          <p className="text-gray-500 mb-4">أنشئ قالباً أولاً لإضافة المحاور والبنود</p>
          <Link href="/dashboard/templates" className="btn btn-primary">
            إنشاء قالب ←
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Templates List */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>القوالب</span>
            </h2>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-all ${
                    selectedTemplate === template.id
                      ? 'bg-blue-50 text-blue-700 font-medium border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Axes List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span>📊</span>
                <span>المحاور</span>
              </h2>
              <button className="text-blue-600 hover:text-blue-700 text-sm">
                + إضافة
              </button>
            </div>
            {axes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📊</div>
                <p>لا توجد محاور</p>
              </div>
            ) : (
              <div className="space-y-2">
                {axes.map((axis) => (
                  <button
                    key={axis.id}
                    onClick={() => setSelectedAxis(axis.id)}
                    className={`w-full text-right px-4 py-3 rounded-xl transition-all ${
                      selectedAxis === axis.id
                        ? 'bg-green-50 text-green-700 font-medium border-2 border-green-500'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium">{axis.name}</div>
                    <div className="text-sm text-gray-500">
                      {axis.code} • {axis.items_count} بند
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span>📋</span>
                <span>البنود</span>
              </h2>
              {selectedAxis && (
                <button className="text-blue-600 hover:text-blue-700 text-sm">
                  + إضافة بند
                </button>
              )}
            </div>
            {!selectedAxis ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">👈</div>
                <p>اختر محوراً لعرض البنود</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📋</div>
                <p>لا توجد بنود في هذا المحور</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const fieldType = fieldTypes[item.field_type] || { label: item.field_type, icon: '📝' };
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            <span className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                              {item.code}
                            </span>
                            {item.name}
                            {item.is_required && (
                              <span className="text-red-500 text-xs">*</span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/templates/items/${item.id}/components`}
                            className="px-3 py-1 rounded-full text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1"
                          >
                            <span>🧩</span>
                            <span>المكونات</span>
                          </Link>
                          <span className={`px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 flex items-center gap-1`}>
                            <span>{fieldType.icon}</span>
                            <span>{fieldType.label}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
