'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, Info, Download, BarChart2, TrendingUp, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  axis?: string;
  section?: string;
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
  structure_hints?: Record<number, {
    structure_id: string;
    data_fields: Array<{
      id: string;
      type: string;
      title: string;
      columns?: any[];
      chart_type?: string;
      suggested_input: string;
    }>;
    has_tables: boolean;
    has_charts: boolean;
  }>;
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
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [uploadResults, setUploadResults] = useState<Record<number, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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
        setLastSaved(new Date());
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 1000),
    [token]
  );

  function validateField(item: Item, value: any): string[] {
    const errors: string[] = [];
    if (!value && value !== 0 && item.required) {
      errors.push('هذا الحقل مطلوب');
      return errors;
    }
    if (!value && !item.required) return errors;

    if (item.field_type === 'number' || item.field_type === 'currency') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push('يجب أن تكون القيمة رقماً صحيحاً');
      } else if (num < 0) {
        errors.push('لا يمكن أن تكون القيمة سلبية');
      }
    }
    if (item.field_type === 'percentage') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push('يجب أن تكون النسبة رقماً');
      } else if (num < 0 || num > 100) {
        errors.push('يجب أن تكون النسبة بين 0 و 100');
      }
    }
    if ((item.field_type === 'table_dynamic' || item.field_type === 'table_static') && Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const row = value[i];
        if (typeof row === 'object') {
          const vals = Object.values(row);
          if (vals.every((v: any) => v === '' || v === null || v === undefined)) {
            errors.push(`الصف ${i + 1}: جميع الخلايا فارغة`);
          }
        }
      }
    }
    return errors;
  }

  function handleChange(itemId: number, value: any) {
    setValues(prev => ({ ...prev, [itemId]: value }));
    // Validate on change
    if (data) {
      const item = data.items.find(i => i.id === itemId);
      if (item) {
        const errors = validateField(item, value);
        setValidationErrors(prev => ({ ...prev, [itemId]: errors }));
      }
    }
    autoSave(itemId, value);
  }

  async function handleSubmit() {
    if (!data) return;

    // Validate all fields before submit
    const allErrors: Record<number, string[]> = {};
    let hasErrors = false;
    for (const item of data.items) {
      const errors = validateField(item, values[item.id]);
      if (errors.length > 0) {
        allErrors[item.id] = errors;
        hasErrors = true;
      }
    }
    setValidationErrors(allErrors);
    if (hasErrors) {
      setError('يرجى تصحيح الأخطاء في النموذج قبل الإرسال');
      return;
    }

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
        const isUploading = uploading[item.id];
        const uploadResult = uploadResults[item.id];
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setUploading(prev => ({ ...prev, [item.id]: true }));
                try {
                  const result = await api.contribute.upload(token, String(item.id), file);
                  setUploadResults(prev => ({ ...prev, [item.id]: result }));
                  handleChange(item.id, file.name);
                } catch (err: any) {
                  setError(err.message || 'فشل في رفع الملف');
                } finally {
                  setUploading(prev => ({ ...prev, [item.id]: false }));
                }
              }}
              disabled={submitted || isUploading}
              className="hidden"
              id={`file-${item.id}`}
              accept={item.field_type === 'image' ? 'image/*' : item.field_type === 'excel_import' ? '.xlsx,.xls' : '*'}
            />
            <label
              htmlFor={`file-${item.id}`}
              className={`cursor-pointer ${isUploading ? 'text-gray-400' : 'text-blue-600 hover:text-blue-700'}`}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                  جاري الرفع...
                </span>
              ) : value ? (
                <span className="flex flex-col items-center gap-1">
                  <span className="text-green-600">&#10003; {value}</span>
                  <span className="text-sm text-gray-500">اضغط لتحديث الملف</span>
                </span>
              ) : (
                'اضغط لاختيار ملف'
              )}
            </label>
            {uploadResult && uploadResult.rows_count !== undefined && (
              <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 text-right">
                <p>تم قراءة <strong>{uploadResult.rows_count}</strong> سطر</p>
                {uploadResult.headers && (
                  <p className="text-xs text-gray-400 mt-1">الأعمدة: {uploadResult.headers.join('، ')}</p>
                )}
              </div>
            )}
            {item.field_type === 'excel_import' && !submitted && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <a
                  href={api.contribute.excelTemplateUrl(token, item.id)}
                  download
                  className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Download className="w-4 h-4" />
                  تحميل قالب Excel فاضي بالأعمدة المطلوبة
                </a>
                <p className="text-xs text-gray-400 mt-1">حمّل القالب، عبّئ البيانات، ثم ارفعه</p>
              </div>
            )}
          </div>
        );
      
      case 'table_dynamic':
      case 'table_static': {
        const columns: { name: string; key: string; type?: string }[] = item.config?.columns || [];
        const fixedRows: string[] = item.config?.fixed_rows || [];
        const tableValue: any[][] = Array.isArray(value) ? value : [];

        // Init rows if empty
        const initRows = () => {
          if (item.field_type === 'table_static' && fixedRows.length > 0) {
            return fixedRows.map((label) => [label, ...Array(Math.max(columns.length - 1, 0)).fill('')]);
          }
          return tableValue.length > 0 ? tableValue : [Array(columns.length || 3).fill('')];
        };
        const rows = initRows();

        const updateCell = (rowIdx: number, colIdx: number, cellValue: string) => {
          const newRows = rows.map((r, ri) =>
            ri === rowIdx ? r.map((c: any, ci: number) => (ci === colIdx ? cellValue : c)) : [...r]
          );
          handleChange(item.id, newRows);
        };

        const addRow = () => {
          const newRow = Array(columns.length || (rows[0]?.length || 3)).fill('');
          handleChange(item.id, [...rows, newRow]);
        };

        const removeRow = (rowIdx: number) => {
          if (rows.length <= 1) return;
          handleChange(item.id, rows.filter((_: any, i: number) => i !== rowIdx));
        };

        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {columns.length > 0
                    ? columns.map((col, i) => (
                        <th key={i} className="border border-gray-300 bg-gray-100 px-3 py-2 text-right font-medium text-gray-700">
                          {col.name || col.key}
                        </th>
                      ))
                    : rows[0]?.map((_: any, i: number) => (
                        <th key={i} className="border border-gray-300 bg-gray-100 px-3 py-2 text-right font-medium text-gray-700">
                          عمود {i + 1}
                        </th>
                      ))}
                  {item.field_type === 'table_dynamic' && !submitted && (
                    <th className="border border-gray-300 bg-gray-100 px-2 py-2 w-10"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any[], rowIdx: number) => (
                  <tr key={rowIdx}>
                    {row.map((cell: any, colIdx: number) => {
                      const isFixed = item.field_type === 'table_static' && colIdx === 0;
                      return (
                        <td key={colIdx} className="border border-gray-300 p-0">
                          {isFixed ? (
                            <div className="px-3 py-2 bg-gray-50 font-medium text-gray-700">{cell}</div>
                          ) : (
                            <input
                              type="text"
                              value={cell ?? ''}
                              onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                              disabled={submitted}
                              className="w-full px-3 py-2 border-0 focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                              placeholder="—"
                            />
                          )}
                        </td>
                      );
                    })}
                    {item.field_type === 'table_dynamic' && !submitted && (
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(rowIdx)}
                          className="text-red-400 hover:text-red-600 p-0.5 rounded transition-colors"
                          title="حذف صف"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!submitted && (
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                {item.field_type === 'table_dynamic' && (
                  <button
                    type="button"
                    onClick={addRow}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <span className="text-lg leading-none">+</span> إضافة صف
                  </button>
                )}
                <a
                  href={api.contribute.excelTemplateUrl(token, item.id)}
                  download
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> تحميل قالب Excel
                </a>
              </div>
            )}
          </div>
        );
      }
      
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

  function renderItemCard(item: Item, index: number) {
    return (
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
              <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                {item.notes}
              </p>
            )}
            {data?.structure_hints?.[item.id] && (
              <div className="mt-2 flex flex-wrap gap-1">
                {data.structure_hints[item.id].data_fields.map((field) => (
                  <span key={field.id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    field.type === 'table' ? 'bg-amber-100 text-amber-700' :
                    field.type === 'chart_data' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {field.type === 'table'
                      ? <BarChart2 className="w-3 h-3" />
                      : field.type === 'chart_data'
                        ? <TrendingUp className="w-3 h-3" />
                        : <FileText className="w-3 h-3" />
                    }
                    {field.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {renderField(item)}
        {validationErrors[item.id]?.length > 0 && (
          <div className="mt-2 space-y-1">
            {validationErrors[item.id].map((err, errIdx) => (
              <p key={errIdx} className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {err}
              </p>
            ))}
          </div>
        )}
      </div>
    );
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
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
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
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{data.project.name}</h1>
              <p className="text-sm text-gray-500">
                {data.entity.name} • {data.organization.name}
              </p>
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-blue-600">{progress}%</div>
              <div className="text-xs text-gray-500">{completedCount}/{data.items_count}</div>
              {lastSaved && (
                <div className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  محفوظ {lastSaved.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-600' : 'bg-amber-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Deadline warning */}
          {data.project.deadline && !submitted && (() => {
            const days = Math.ceil((new Date(data.project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (days <= 0) return (
              <div className="mt-2 text-xs text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg">
                انتهى الموعد النهائي — يرجى الإرسال فوراً
              </div>
            );
            if (days <= 3) return (
              <div className="mt-2 text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-lg">
                متبقي {days} يوم على الموعد النهائي ({data.project.deadline})
              </div>
            );
            return null;
          })()}
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
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تم إرسال البيانات!</h2>
            <p className="text-gray-600">
              شكراً لمساهمتك في {data.project.name}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group items by axis/section */}
            {(() => {
              const hasGroups = data.items.some(i => i.axis || i.section);
              if (!hasGroups) {
                return data.items.map((item, index) => renderItemCard(item, index));
              }
              const groups: Record<string, Item[]> = {};
              data.items.forEach(item => {
                const key = item.section || item.axis || 'عام';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
              });
              return Object.entries(groups).map(([groupName, groupItems]) => {
                const isCollapsed = collapsedSections[groupName];
                const groupFilled = groupItems.filter(i => values[i.id] !== '' && values[i.id] !== undefined).length;
                return (
                  <div key={groupName} className="space-y-4">
                    <button
                      onClick={() => setCollapsedSections(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-800">{groupName}</span>
                        <span className="text-xs text-gray-500">{groupFilled}/{groupItems.length} مكتمل</span>
                        {groupFilled === groupItems.length && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
                    </button>
                    {!isCollapsed && groupItems.map((item, idx) => renderItemCard(item, data.items.indexOf(item)))}
                  </div>
                );
              });
            })()}

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
