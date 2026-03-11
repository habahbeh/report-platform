'use client';

import { useState, useEffect } from 'react';
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
  is_public: boolean;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Axis {
  id: number;
  name: string;
  code: string;
  items_count: number;
}

const categoryLabels: Record<string, { label: string; icon: string; color: string }> = {
  higher_education: { label: 'التعليم العالي', icon: '🎓', color: 'blue' },
  government: { label: 'الحكومة', icon: '🏛️', color: 'indigo' },
  corporate: { label: 'الشركات', icon: '🏢', color: 'green' },
  healthcare: { label: 'الصحة', icon: '🏥', color: 'red' },
  other: { label: 'أخرى', icon: '📋', color: 'gray' },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [axes, setAxes] = useState<Axis[]>([]);
  const [loadingAxes, setLoadingAxes] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateNameEn, setNewTemplateNameEn] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('higher_education');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await api.templates.list();
      const list = data.results || data || [];
      setTemplates(list);
      // Auto-select first template
      if (list.length > 0) {
        selectTemplate(list[0]);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function selectTemplate(template: Template) {
    setSelectedTemplate(template);
    setLoadingAxes(true);
    try {
      const axesData = await api.axes.list(template.id);
      setAxes(axesData.results || axesData || []);
    } catch (error) {
      console.error('Failed to load axes:', error);
      setAxes([]);
    } finally {
      setLoadingAxes(false);
    }
  }

  async function handleCreateTemplate() {
    if (!newTemplateName.trim()) return;

    setCreating(true);
    try {
      const newTemplate = await api.templates.create({
        name: newTemplateName,
        name_en: newTemplateNameEn,
        description: newTemplateDescription,
        category: newTemplateCategory,
      });
      setTemplates([...templates, newTemplate]);
      setShowCreateModal(false);
      resetCreateForm();
      selectTemplate(newTemplate);
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('فشل في إنشاء القالب');
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setNewTemplateName('');
    setNewTemplateNameEn('');
    setNewTemplateDescription('');
    setNewTemplateCategory('higher_education');
  }

  async function handleDuplicateTemplate(template: Template) {
    try {
      const duplicated = await api.templates.duplicate(template.id, `نسخة من ${template.name}`);
      setTemplates([...templates, duplicated]);
      selectTemplate(duplicated);
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      alert('فشل في نسخ القالب');
    }
  }

  async function handleDeleteTemplate(template: Template) {
    if (!confirm(`هل أنت متأكد من حذف القالب "${template.name}"؟\n\nسيتم حذف جميع المحاور والبنود والجهات المرتبطة.`)) return;

    try {
      await api.templates.delete(template.id);
      const newList = templates.filter(t => t.id !== template.id);
      setTemplates(newList);
      if (selectedTemplate?.id === template.id) {
        setSelectedTemplate(newList[0] || null);
        if (newList[0]) selectTemplate(newList[0]);
        else setAxes([]);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('فشل في حذف القالب');
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(templates.map(t => t.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل القوالب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>📋</span>
            <span>القوالب</span>
          </h1>
          <p className="text-gray-500 mt-1">
            إدارة قوالب التقارير - تعريف المحاور والبنود والجهات
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <span>➕</span>
          <span>قالب جديد</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 ابحث في القوالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? (
                'الكل'
              ) : (
                <>
                  <span>{categoryLabels[cat]?.icon || '📋'}</span>
                  <span>{categoryLabels[cat]?.label || cat}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <div className="card h-fit sticky top-20">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>📋</span>
                <span>القوالب</span>
              </span>
              <span className="text-sm font-normal bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                {filteredTemplates.length}
              </span>
            </h2>

            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedCategory !== 'all'
                    ? 'لا توجد قوالب متطابقة'
                    : 'لا توجد قوالب بعد'
                  }
                </p>
                {!searchTerm && selectedCategory === 'all' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary text-sm"
                  >
                    إنشاء قالب جديد
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
                {filteredTemplates.map((template) => {
                  const category = categoryLabels[template.category] || { label: template.category, icon: '📋', color: 'gray' };
                  const isSelected = selectedTemplate?.id === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      className={`w-full p-4 rounded-xl text-right transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 truncate">{template.name}</h3>
                            {template.is_default && (
                              <span className="flex-shrink-0 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                افتراضي
                              </span>
                            )}
                          </div>
                          {template.name_en && (
                            <p className="text-xs text-gray-400 truncate">{template.name_en}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{template.axes_count} محور</span>
                            <span>•</span>
                            <span>{template.items_count} بند</span>
                            <span>•</span>
                            <span>{template.entities_count} جهة</span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-blue-500 flex-shrink-0">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Template Details */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="space-y-6">
              {/* Template Info Card */}
              <div className="card">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">
                      {categoryLabels[selectedTemplate.category]?.icon || '📋'}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">
                          {selectedTemplate.name}
                        </h2>
                        {selectedTemplate.is_default && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium">
                            القالب الافتراضي
                          </span>
                        )}
                      </div>
                      {selectedTemplate.name_en && (
                        <p className="text-gray-400 text-sm mt-1">{selectedTemplate.name_en}</p>
                      )}
                      <p className="text-gray-500 mt-2">
                        {selectedTemplate.description || 'بدون وصف'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/templates/${selectedTemplate.id}`}
                      className="btn btn-primary text-sm"
                    >
                      ✏️ تعديل
                    </Link>
                    <button
                      onClick={() => handleDuplicateTemplate(selectedTemplate)}
                      className="btn btn-secondary text-sm"
                      title="نسخ القالب"
                    >
                      📋 نسخ
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(selectedTemplate)}
                      className="btn btn-danger text-sm"
                      title="حذف القالب"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-blue-50 text-center border border-blue-100">
                    <div className="text-3xl font-bold text-blue-700">
                      {selectedTemplate.axes_count}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">محور</div>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 text-center border border-green-100">
                    <div className="text-3xl font-bold text-green-700">
                      {selectedTemplate.items_count}
                    </div>
                    <div className="text-sm text-green-600 font-medium">بند</div>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 text-center border border-purple-100">
                    <div className="text-3xl font-bold text-purple-700">
                      {selectedTemplate.entities_count}
                    </div>
                    <div className="text-sm text-purple-600 font-medium">جهة</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/templates/${selectedTemplate.id}`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <span>⚙️</span>
                    <span>إعدادات القالب</span>
                  </Link>
                  <Link
                    href={`/dashboard/templates/${selectedTemplate.id}/axes`}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center gap-2"
                  >
                    <span>🏗️</span>
                    <span>إدارة المحاور</span>
                  </Link>
                  <Link
                    href={`/dashboard/templates/${selectedTemplate.id}/entities`}
                    className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition-colors flex items-center gap-2"
                  >
                    <span>🏢</span>
                    <span>إدارة الجهات</span>
                  </Link>
                  <Link
                    href={`/dashboard/projects/new?template=${selectedTemplate.id}`}
                    className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors flex items-center gap-2"
                  >
                    <span>➕</span>
                    <span>إنشاء مشروع بهذا القالب</span>
                  </Link>
                </div>
              </div>

              {/* Axes Preview */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <span>🏗️</span>
                    <span>المحاور</span>
                    <span className="text-sm font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg">
                      {axes.length}
                    </span>
                  </h3>
                  <Link
                    href={`/dashboard/templates/${selectedTemplate.id}/axes`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    إدارة المحاور ←
                  </Link>
                </div>

                {loadingAxes ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : axes.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <div className="text-4xl mb-3">🏗️</div>
                    <p className="text-gray-500 mb-4">لا توجد محاور في هذا القالب</p>
                    <Link
                      href={`/dashboard/templates/${selectedTemplate.id}/axes/new`}
                      className="btn btn-primary text-sm"
                    >
                      ➕ إضافة محور جديد
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {axes.map((axis, index) => (
                      <Link
                        key={axis.id}
                        href={`/dashboard/templates/${selectedTemplate.id}/axes/${axis.id}`}
                        className="block p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {axis.name}
                              </h4>
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                  {axis.code}
                                </span>
                                <span>{axis.items_count} بند</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-[-4px] transition-all">
                            ←
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                اختر قالباً للعرض
              </h3>
              <p className="text-gray-500 mb-6">
                أو قم بإنشاء قالب جديد للبدء
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                ➕ إنشاء قالب جديد
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>➕</span>
                <span>إنشاء قالب جديد</span>
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">اسم القالب (عربي) *</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="input"
                  placeholder="مثال: التقرير السنوي لجامعة البترا"
                />
              </div>

              <div>
                <label className="label">اسم القالب (إنجليزي)</label>
                <input
                  type="text"
                  value={newTemplateNameEn}
                  onChange={(e) => setNewTemplateNameEn(e.target.value)}
                  className="input"
                  placeholder="Example: Petra University Annual Report"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="label">التصنيف</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNewTemplateCategory(key)}
                      className={`p-3 rounded-xl border-2 text-right transition-all flex items-center gap-3 ${
                        newTemplateCategory === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{icon}</span>
                      <span className="font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">الوصف (اختياري)</label>
                <textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="وصف مختصر للقالب ومحتوياته..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="btn btn-secondary"
                disabled={creating}
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateTemplate}
                className="btn btn-primary flex items-center gap-2"
                disabled={creating || !newTemplateName.trim()}
              >
                {creating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>جاري الإنشاء...</span>
                  </>
                ) : (
                  <>
                    <span>➕</span>
                    <span>إنشاء القالب</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
