'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { debounce } from '@/lib/utils';

interface Item {
  id: number;
  code: string;
  name: string;
  name_en: string;
  description: string;
  field_type: string;
  config: any;
  required: boolean;
  unit: string;
  notes: string;
}

interface Response {
  id: number;
  item: number;
  value: any;
  attachments: any[];
}

interface ContributeData {
  project: {
    id: string;
    name: string;
    period: string;
    deadline: string | null;
  };
  organization: {
    name: string;
  };
  entity: {
    id: number;
    name: string;
  };
  contributor: {
    id: string;
    name: string;
    status: string;
  };
  items: Item[];
  responses: Response[];
  progress: number;
  items_count: number;
  completed_count: number;
}

export default function ContributePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [data, setData] = useState<ContributeData | null>(null);
  const [values, setValues] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadForm();
  }, [token]);

  async function loadForm() {
    try {
      const formData = await api.contribute.getForm(token);
      setData(formData);
      
      // Initialize values from existing responses
      const initialValues: Record<number, any> = {};
      formData.responses.forEach((response: Response) => {
        initialValues[response.item] = response.value?.value || response.value;
      });
      setValues(initialValues);
      
      if (formData.contributor.status === 'submitted' || formData.contributor.status === 'completed') {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في تحميل النموذج');
    } finally {
      setLoading(false);
    }
  }

  // Debounced auto-save
  const autoSave = useCallback(
    debounce(async (itemId: number, value: any) => {
      try {
        await api.contribute.save(token, [{ item_id: itemId, value }]);
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 1000),
    [token]
  );

  function handleChange(itemId: number, value: any) {
    setValues(prev => ({ ...prev, [itemId]: value }));
    autoSave(itemId, value);
  }

  async function handleSubmit() {
    if (!data) return;
    
    setSaving(true);
    setError('');
    
    try {
      // Save all values first
      const responses = Object.entries(values).map(([itemId, value]) => ({
        item_id: parseInt(itemId),
        value,
      }));
      
      await api.contribute.save(token, responses);
      await api.contribute.submit(token);
      
      setSubmitted(true);
      setSuccess('تم إرسال البيانات بنجاح! شكراً لمساهمتك.');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setSaving(false);
    }
  }

  function renderField(item: Item) {
    const value = values[item.id] ?? '';
    const baseClasses = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    
    switch (item.field_type) {
      case 'number':
      case 'currency':
        return (
          <div className="relative">
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(item.id, e.target.value)}
              placeholder="أدخل رقماً"
              className={baseClasses}
              disabled={submitted}
            />
            {item.unit && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {item.unit}
              </span>
            )}
          </div>
        );
      
      case 'percentage':
        return (
          <div className="relative">
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(item.id, e.target.value)}
              placeholder="أدخل النسبة"
              min="0"
              max="100"
              step="0.01"
              className={baseClasses}
              disabled={submitted}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
          </div>
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(item.id, e.target.value)}
            className={baseClasses}
            disabled={submitted}
          />
        );
      
      case 'rich_text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(item.id, e.target.value)}
            placeholder="أدخل النص..."
            rows={5}
            className={baseClasses}
            disabled={submitted}
          />
        );
      
      case 'select':
        const options = item.config?.options || [];
        return (
          <select
            value={value}
            onChange={(e) => handleChange(item.id, e.target.value)}
            className={baseClasses}
            disabled={submitted}
          >
            <option value="">اختر...</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case 'multi_select':
        const multiOptions = item.config?.options || [];
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {multiOptions.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleChange(item.id, [...selectedValues, opt]);
                    } else {
                      handleChange(item.id, selectedValues.filter((v: string) => v !== opt));
                    }
                  }}
                  disabled={submitted}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );
      
      case 'file':
      case 'excel_import':
      case 'image':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Handle file upload
                  handleChange(item.id, file.name);
                }
              }}
              disabled={submitted}
              className="hidden"
              id={`file-${item.id}`}
              accept={item.field_type === 'image' ? 'image/*' : item.field_type === 'excel_import' ? '.xlsx,.xls' : '*'}
            />
            <label
              htmlFor={`file-${item.id}`}
              className="cursor-pointer text-blue-600 hover:text-blue-700"
            >
              {value || 'اضغط لاختيار ملف'}
            </label>
          </div>
        );
      
      case 'table_dynamic':
      case 'table_static':
        // TODO: Implement table input
        return (
          <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500">
            جدول البيانات (سيتم دعمه قريباً)
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(item.id, e.target.value)}
            placeholder="أدخل القيمة"
            className={baseClasses}
            disabled={submitted}
          />
        );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const completedCount = Object.keys(values).filter(k => values[parseInt(k)] !== '' && values[parseInt(k)] !== undefined).length;
  const progress = Math.round((completedCount / data.items_count) * 100);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{data.project.name}</h1>
              <p className="text-sm text-gray-500">
                {data.entity.name} • {data.organization.name}
              </p>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-500">التقدم</div>
              <div className="text-lg font-bold text-blue-600">{progress}%</div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center">
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تم إرسال البيانات!</h2>
            <p className="text-gray-600">
              شكراً لمساهمتك في {data.project.name}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.items.map((item, index) => (
              <div key={item.id} className="card">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {item.name}
                      {item.required && <span className="text-red-500 mr-1">*</span>}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-blue-600 mt-1">💡 {item.notes}</p>
                    )}
                  </div>
                </div>
                
                {renderField(item)}
              </div>
            ))}

            {/* Submit */}
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    أكملت {completedCount} من {data.items_count} بند
                  </p>
                  <p className="text-sm text-gray-600">
                    البيانات تُحفظ تلقائياً
                  </p>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={saving || completedCount < data.items.filter(i => i.required).length}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      جاري الإرسال...
                    </span>
                  ) : (
                    'إرسال البيانات'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
