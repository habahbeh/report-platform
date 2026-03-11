'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem, ScaleHover } from '@/components/ui/motion';
import {
  FileText,
  Plus,
  Search,
  GraduationCap,
  Building,
  Briefcase,
  Heart,
  FileStack,
  Settings,
  Layers,
  Building2,
  Copy,
  Trash2,
  Check,
  X,
  ChevronLeft,
  Loader2,
} from 'lucide-react';

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

const categoryConfig: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  higher_education: { label: 'التعليم العالي', icon: GraduationCap, color: 'blue' },
  government: { label: 'الحكومة', icon: Building, color: 'indigo' },
  corporate: { label: 'الشركات', icon: Briefcase, color: 'green' },
  healthcare: { label: 'الصحة', icon: Heart, color: 'red' },
  other: { label: 'أخرى', icon: FileStack, color: 'gray' },
};

const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/50', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  green: { bg: 'bg-green-50 dark:bg-green-950/50', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  red: { bg: 'bg-red-50 dark:bg-red-950/50', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  gray: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [axes, setAxes] = useState<Axis[]>([]);
  const [loadingAxes, setLoadingAxes] = useState(false);

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
    if (!confirm(`هل أنت متأكد من حذف القالب "${template.name}"؟`)) return;
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
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل القوالب...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FileText className="w-7 h-7 text-blue-600" />
                <span>القوالب</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                إدارة قوالب التقارير - تعريف المحاور والبنود والجهات
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-5 h-5" />
              <span>قالب جديد</span>
            </button>
          </div>
        </FadeIn>

        {/* Filters */}
        <FadeIn delay={0.1}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث في القوالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => {
                const config = categoryConfig[cat];
                const Icon = config?.icon || FileStack;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat === 'all' ? 'الكل' : (
                      <>
                        <Icon className="w-4 h-4" />
                        <span>{config?.label || cat}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <FadeIn delay={0.2} className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 h-fit sticky top-20">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>القوالب</span>
                </span>
                <span className="text-sm font-normal bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg">
                  {filteredTemplates.length}
                </span>
              </h2>

              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm || selectedCategory !== 'all' ? 'لا توجد قوالب متطابقة' : 'لا توجد قوالب بعد'}
                  </p>
                  {!searchTerm && selectedCategory === 'all' && (
                    <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">
                      إنشاء قالب جديد
                    </button>
                  )}
                </div>
              ) : (
                <StaggerContainer className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredTemplates.map((template) => {
                    const config = categoryConfig[template.category] || { label: template.category, icon: FileStack, color: 'gray' };
                    const Icon = config.icon;
                    const styles = colorStyles[config.color];
                    const isSelected = selectedTemplate?.id === template.id;

                    return (
                      <StaggerItem key={template.id}>
                        <button
                          onClick={() => selectTemplate(template)}
                          className={`w-full p-4 rounded-xl text-right transition-all ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/50 border-2 border-blue-500 shadow-sm'
                              : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${styles.bg}`}>
                              <Icon className={`w-5 h-5 ${styles.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{template.name}</h3>
                                {template.is_default && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded text-xs">
                                    افتراضي
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{template.axes_count} محور</span>
                                <span>•</span>
                                <span>{template.items_count} بند</span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                          </div>
                        </button>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </div>
          </FadeIn>

          {/* Template Details */}
          <FadeIn delay={0.3} className="lg:col-span-2">
            {selectedTemplate ? (
              <div className="space-y-6">
                {/* Template Info Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${colorStyles[categoryConfig[selectedTemplate.category]?.color || 'gray'].bg}`}>
                        {(() => {
                          const Icon = categoryConfig[selectedTemplate.category]?.icon || FileStack;
                          return <Icon className={`w-8 h-8 ${colorStyles[categoryConfig[selectedTemplate.category]?.color || 'gray'].text}`} />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                          {selectedTemplate.name}
                          {selectedTemplate.is_default && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs">
                              افتراضي
                            </span>
                          )}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                          {selectedTemplate.description || 'بدون وصف'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/templates/${selectedTemplate.id}`} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Settings className="w-5 h-5" />
                      </Link>
                      <button onClick={() => handleDuplicateTemplate(selectedTemplate)} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Copy className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteTemplate(selectedTemplate)} className="p-2 bg-red-50 dark:bg-red-950/50 text-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-center border border-blue-100 dark:border-blue-800">
                      <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{selectedTemplate.axes_count}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">محور</div>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/50 text-center border border-green-100 dark:border-green-800">
                      <div className="text-3xl font-bold text-green-700 dark:text-green-400">{selectedTemplate.items_count}</div>
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium">بند</div>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-center border border-purple-100 dark:border-purple-800">
                      <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">{selectedTemplate.entities_count}</div>
                      <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">جهة</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/templates/${selectedTemplate.id}/axes`} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm">
                      <Layers className="w-4 h-4" />
                      <span>إدارة المحاور</span>
                    </Link>
                    <Link href={`/dashboard/templates/${selectedTemplate.id}/entities`} className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 text-sm">
                      <Building2 className="w-4 h-4" />
                      <span>إدارة الجهات</span>
                    </Link>
                  </div>
                </div>

                {/* Axes Preview */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-600" />
                      <span>المحاور</span>
                      <span className="text-sm font-normal bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-lg">{axes.length}</span>
                    </h3>
                    <Link href={`/dashboard/templates/${selectedTemplate.id}/axes`} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                      إدارة المحاور
                      <ChevronLeft className="w-4 h-4" />
                    </Link>
                  </div>

                  {loadingAxes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : axes.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <Layers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">لا توجد محاور في هذا القالب</p>
                      <Link href={`/dashboard/templates/${selectedTemplate.id}/axes/new`} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">
                        <Plus className="w-4 h-4" />
                        إضافة محور جديد
                      </Link>
                    </div>
                  ) : (
                    <StaggerContainer className="space-y-3">
                      {axes.map((axis, index) => (
                        <StaggerItem key={axis.id}>
                          <ScaleHover scale={1.01}>
                            <Link href={`/dashboard/templates/${selectedTemplate.id}/axes/${axis.id}`} className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{axis.name}</h4>
                                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                      <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">{axis.code}</span>
                                      <span>{axis.items_count} بند</span>
                                    </div>
                                  </div>
                                </div>
                                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:-translate-x-1 transition-all" />
                              </div>
                            </Link>
                          </ScaleHover>
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-16 text-center">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">اختر قالباً للعرض</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">أو قم بإنشاء قالب جديد للبدء</p>
                <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl">
                  <Plus className="w-5 h-5" />
                  إنشاء قالب جديد
                </button>
              </div>
            )}
          </FadeIn>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <FadeIn className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-6 h-6 text-blue-600" />
                  <span>إنشاء قالب جديد</span>
                </h2>
                <button onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم القالب (عربي) *</label>
                  <input type="text" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" placeholder="مثال: التقرير السنوي" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم القالب (إنجليزي)</label>
                  <input type="text" value={newTemplateNameEn} onChange={(e) => setNewTemplateNameEn(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" placeholder="Annual Report" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التصنيف</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(categoryConfig).map(([key, { label, icon: Icon }]) => (
                      <button key={key} type="button" onClick={() => setNewTemplateCategory(key)} className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${newTemplateCategory === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                        <Icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف (اختياري)</label>
                  <textarea value={newTemplateDescription} onChange={(e) => setNewTemplateDescription(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[100px]" placeholder="وصف مختصر للقالب..." />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl" disabled={creating}>
                  إلغاء
                </button>
                <button onClick={handleCreateTemplate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50" disabled={creating || !newTemplateName.trim()}>
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  <span>{creating ? 'جاري الإنشاء...' : 'إنشاء القالب'}</span>
                </button>
              </div>
            </FadeIn>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
