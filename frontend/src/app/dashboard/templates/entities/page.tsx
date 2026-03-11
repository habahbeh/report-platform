'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Template {
  id: number;
  name: string;
}

interface Entity {
  id: number;
  template: number;
  code: string;
  name: string;
  name_en: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  items_count: number;
  contact_person: string | null;
}

export default function EntitiesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadEntities();
    }
  }, [selectedTemplate]);

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

  async function loadEntities() {
    if (!selectedTemplate) return;
    try {
      const data = await api.entities.list(selectedTemplate);
      setEntities(data.results || data || []);
    } catch (error) {
      console.error('Failed to load entities:', error);
    }
  }

  const filteredEntities = entities.filter(
    (e) =>
      e.name.includes(searchQuery) ||
      e.code.includes(searchQuery) ||
      (e.email && e.email.includes(searchQuery))
  );

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
            <span>🏢</span>
            <span>الجهات</span>
          </h1>
          <p className="text-gray-500 mt-1">
            إدارة الجهات المشاركة في التقرير
          </p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <span>➕</span>
          <span>إضافة جهة</span>
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد قوالب</h3>
          <p className="text-gray-500 mb-4">أنشئ قالباً أولاً لإضافة الجهات</p>
          <Link href="/dashboard/templates" className="btn btn-primary">
            إنشاء قالب ←
          </Link>
        </div>
      ) : (
        <>
          {/* Template Selector */}
          <div className="card">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-gray-600 font-medium">القالب:</span>
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    selectedTemplate === template.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="card">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 بحث عن جهة..."
              className="input w-full md:w-96"
            />
          </div>

          {/* Entities Grid */}
          {filteredEntities.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {searchQuery ? 'لا توجد نتائج' : 'لا توجد جهات'}
              </h3>
              <p className="text-gray-500">
                {searchQuery
                  ? 'جرّب البحث بكلمات مختلفة'
                  : 'أضف جهات للمشاركة في التقرير'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEntities.map((entity) => (
                <div
                  key={entity.id}
                  className="card hover:shadow-lg transition-all border-r-4 border-r-blue-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{entity.name}</h3>
                      <p className="text-sm text-gray-500">{entity.code}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        entity.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {entity.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>

                  {entity.name_en && (
                    <p className="text-sm text-gray-500 mb-2">{entity.name_en}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    {entity.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>📧</span>
                        <span>{entity.email}</span>
                      </div>
                    )}
                    {entity.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>📞</span>
                        <span>{entity.phone}</span>
                      </div>
                    )}
                    {entity.contact_person && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>👤</span>
                        <span>{entity.contact_person}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {entity.items_count} بند مطلوب
                    </span>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                        تعديل
                      </button>
                      <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
