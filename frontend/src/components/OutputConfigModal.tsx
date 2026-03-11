'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface OutputComponent {
  id?: number;
  type: 'text' | 'table' | 'chart' | 'image';
  type_display?: string;
  source: 'auto' | 'manual' | 'mixed';
  source_display?: string;
  title: string;
  order: number;
  enabled?: boolean;
}

interface OutputTemplate {
  id: number;
  code: string;
  name: string;
  description: string;
  is_default: boolean;
  components: OutputComponent[];
}

interface OutputConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemDraftId: string;
  itemCode: string;
  itemName: string;
  onSave?: () => void;
}

const COMPONENT_TYPES = [
  { value: 'text', label: 'نص تحليلي', icon: '📝', source_options: ['auto', 'manual', 'mixed'] },
  { value: 'table', label: 'جدول', icon: '📊', source_options: ['auto', 'manual'] },
  { value: 'chart', label: 'رسم بياني', icon: '📈', source_options: ['auto'] },
  { value: 'image', label: 'صورة', icon: '🖼️', source_options: ['manual'] },
];

const SOURCE_LABELS: Record<string, string> = {
  auto: 'تلقائي (AI)',
  manual: 'يدوي',
  mixed: 'مختلط',
};

export default function OutputConfigModal({
  isOpen,
  onClose,
  itemDraftId,
  itemCode,
  itemName,
  onSave,
}: OutputConfigModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [templates, setTemplates] = useState<OutputTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [components, setComponents] = useState<OutputComponent[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, itemDraftId]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.generation.outputConfig.get(itemDraftId);
      setTemplates(data.available_templates || []);
      
      if (data.current_template) {
        setSelectedTemplateId(data.current_template.id);
        setComponents(
          data.current_template.components.map((c: OutputComponent, idx: number) => ({
            ...c,
            enabled: true,
            order: c.order ?? idx,
          }))
        );
        // Check if it's a custom template
        setUseCustom(data.current_template.code?.startsWith('custom_'));
      } else {
        // Use default components
        setComponents([
          { type: 'text', source: 'auto', title: 'التحليل', order: 0, enabled: true },
        ]);
        setUseCustom(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: number) => {
    setSelectedTemplateId(templateId);
    setUseCustom(false);
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComponents(
        template.components.map((c, idx) => ({
          ...c,
          enabled: true,
          order: c.order ?? idx,
        }))
      );
    }
  };

  const handleUseCustom = () => {
    setUseCustom(true);
    setSelectedTemplateId(null);
  };

  const toggleComponent = (type: string) => {
    const exists = components.find(c => c.type === type);
    if (exists) {
      setComponents(components.filter(c => c.type !== type));
    } else {
      const compType = COMPONENT_TYPES.find(t => t.value === type)!;
      const defaultSource = compType.source_options[0] as 'auto' | 'manual' | 'mixed';
      setComponents([
        ...components,
        {
          type: type as any,
          source: defaultSource,
          title: compType.label,
          order: components.length,
          enabled: true,
        },
      ]);
    }
  };

  const updateComponentSource = (index: number, source: 'auto' | 'manual' | 'mixed') => {
    const updated = [...components];
    updated[index].source = source;
    setComponents(updated);
  };

  const moveComponent = (fromIndex: number, toIndex: number) => {
    const updated = [...components];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    // Update order
    updated.forEach((c, idx) => c.order = idx);
    setComponents(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveComponent(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      if (useCustom) {
        await api.generation.outputConfig.set(itemDraftId, {
          output_template_id: null,
          custom_components: components.map((c, idx) => ({
            type: c.type,
            enabled: true,
            order: idx,
            source: c.source,
            title: c.title,
          })),
        });
      } else if (selectedTemplateId) {
        await api.generation.outputConfig.set(itemDraftId, {
          output_template_id: selectedTemplateId,
        });
      }
      
      onSave?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold">⚙️ إعدادات المخرجات</h2>
            <p className="text-sm text-gray-600">
              {itemCode} - {itemName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin text-4xl mb-4">⚙️</div>
              <p className="text-gray-600">جاري التحميل...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {/* Template Selection */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">📋 اختر قالب</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`p-3 rounded-lg border-2 text-right transition-colors ${
                        selectedTemplateId === template.id && !useCustom
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.components.length} مكونات
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={handleUseCustom}
                    className={`p-3 rounded-lg border-2 text-right transition-colors ${
                      useCustom
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-dashed border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium text-sm">🎨 مخصص</div>
                    <div className="text-xs text-gray-500 mt-1">
                      حدد المكونات يدوياً
                    </div>
                  </button>
                </div>
              </div>

              {/* Components Configuration */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">🧩 المكونات</h3>
                
                {/* Component Toggle Buttons */}
                {useCustom && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {COMPONENT_TYPES.map((type) => {
                      const isActive = components.some(c => c.type === type.value);
                      return (
                        <button
                          key={type.value}
                          onClick={() => toggleComponent(type.value)}
                          className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            isActive
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                          {isActive && <span className="text-green-600">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Component List (Sortable) */}
                <div className="space-y-2">
                  {components.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                      لم يتم اختيار أي مكونات
                    </div>
                  ) : (
                    components.map((comp, index) => {
                      const typeInfo = COMPONENT_TYPES.find(t => t.value === comp.type)!;
                      return (
                        <div
                          key={`${comp.type}-${index}`}
                          draggable={useCustom}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border ${
                            draggedIndex === index ? 'opacity-50' : ''
                          } ${useCustom ? 'cursor-move' : ''}`}
                        >
                          {/* Drag Handle */}
                          {useCustom && (
                            <span className="text-gray-400 cursor-move">⋮⋮</span>
                          )}
                          
                          {/* Order */}
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          
                          {/* Icon & Type */}
                          <span className="text-xl">{typeInfo.icon}</span>
                          <span className="flex-1 font-medium">{typeInfo.label}</span>
                          
                          {/* Source Selector */}
                          {useCustom && typeInfo.source_options.length > 1 ? (
                            <select
                              value={comp.source}
                              onChange={(e) => updateComponentSource(index, e.target.value as any)}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              {typeInfo.source_options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {SOURCE_LABELS[opt]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm text-gray-500">
                              {SOURCE_LABELS[comp.source]}
                            </span>
                          )}
                          
                          {/* Remove Button */}
                          {useCustom && (
                            <button
                              onClick={() => toggleComponent(comp.type)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">👁️ معاينة شكل المخرجات:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  {components.map((comp, idx) => {
                    const typeInfo = COMPONENT_TYPES.find(t => t.value === comp.type)!;
                    return (
                      <div key={idx}>
                        {idx + 1}. {typeInfo.icon} {typeInfo.label}
                        <span className="text-blue-500 text-xs mr-1">
                          ({SOURCE_LABELS[comp.source]})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || components.length === 0}
            className={`px-6 py-2 rounded-lg text-white font-medium ${
              saving || loading || components.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>
      </div>
    </div>
  );
}
