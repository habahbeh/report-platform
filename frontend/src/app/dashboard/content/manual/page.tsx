'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

interface ItemDraft {
  id: string;
  item: number;
  item_code: string;
  item_name: string;
  axis_id: number;
  axis_code: string;
  axis_name: string;
  content: string;
  manual_content: ManualContentItem[];
  status: string;
}

interface ManualContentItem {
  type: 'image' | 'table' | 'text';
  attachment_id?: string;
  data?: string[][];
  content?: string;
  title?: string;
  caption?: string;
  order: number;
}

interface Attachment {
  id: string;
  file_url: string;
  filename: string;
  file_type: string;
  caption: string;
  order: number;
}

interface Period {
  id: number;
  name: string;
  academic_year: string;
}

interface AxisWithItems {
  axis_id: number;
  axis_code: string;
  axis_name: string;
  drafts: ItemDraft[];
}

export default function ManualContentPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [axes, setAxes] = useState<AxisWithItems[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<ItemDraft | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [manualContent, setManualContent] = useState<ManualContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load periods
  useEffect(() => {
    loadPeriods();
  }, []);

  // Load items when period changes
  useEffect(() => {
    if (selectedPeriod) {
      loadItems(selectedPeriod);
    }
  }, [selectedPeriod]);

  // Load attachments when draft is selected
  useEffect(() => {
    if (selectedDraft) {
      loadAttachments(selectedDraft.id);
      setManualContent(selectedDraft.manual_content || []);
    }
  }, [selectedDraft]);

  const loadPeriods = async () => {
    try {
      const data = await api.data.periods.list();
      const periodsArray = Array.isArray(data) ? data : (data?.results || []);
      setPeriods(periodsArray);
      if (periodsArray.length > 0) {
        const openPeriod = periodsArray.find((p: any) => p.status === 'open');
        setSelectedPeriod(openPeriod?.id || periodsArray[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadItems = async (periodId: number) => {
    setLoading(true);
    try {
      const data = await api.generation.getItemDrafts(periodId);
      setAxes(data.axes || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async (draftId: string) => {
    try {
      const data = await api.generation.attachments.list(draftId);
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading attachments:', err);
      setAttachments([]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedDraft) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        await api.generation.attachments.upload(file, selectedDraft.id);
      }
      await loadAttachments(selectedDraft.id);
      setSuccess('تم رفع الملفات بنجاح');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('هل تريد حذف هذا المرفق؟')) return;

    try {
      await api.generation.attachments.delete(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      // Remove from manual content if used
      setManualContent(prev => prev.filter(mc => mc.attachment_id !== attachmentId));
      setSuccess('تم حذف المرفق');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addImageToContent = (attachment: Attachment) => {
    const newItem: ManualContentItem = {
      type: 'image',
      attachment_id: attachment.id,
      caption: attachment.caption || '',
      order: manualContent.length,
    };
    setManualContent(prev => [...prev, newItem]);
  };

  const addTableToContent = () => {
    const newItem: ManualContentItem = {
      type: 'table',
      title: 'جدول جديد',
      data: [
        ['العمود 1', 'العمود 2', 'العمود 3'],
        ['', '', ''],
        ['', '', ''],
      ],
      order: manualContent.length,
    };
    setManualContent(prev => [...prev, newItem]);
  };

  const addTextToContent = () => {
    const newItem: ManualContentItem = {
      type: 'text',
      content: '',
      order: manualContent.length,
    };
    setManualContent(prev => [...prev, newItem]);
  };

  const updateContentItem = (index: number, updates: Partial<ManualContentItem>) => {
    setManualContent(prev => {
      const newContent = [...prev];
      newContent[index] = { ...newContent[index], ...updates };
      return newContent;
    });
  };

  const removeContentItem = (index: number) => {
    setManualContent(prev => prev.filter((_, i) => i !== index));
  };

  const moveContentItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= manualContent.length) return;

    setManualContent(prev => {
      const newContent = [...prev];
      [newContent[index], newContent[newIndex]] = [newContent[newIndex], newContent[index]];
      return newContent.map((item, i) => ({ ...item, order: i }));
    });
  };

  const updateTableCell = (contentIndex: number, row: number, col: number, value: string) => {
    setManualContent(prev => {
      const newContent = [...prev];
      const item = { ...newContent[contentIndex] };
      if (item.data) {
        const newData = item.data.map(r => [...r]);
        newData[row][col] = value;
        item.data = newData;
        newContent[contentIndex] = item;
      }
      return newContent;
    });
  };

  const addTableRow = (contentIndex: number) => {
    setManualContent(prev => {
      const newContent = [...prev];
      const item = { ...newContent[contentIndex] };
      if (item.data && item.data.length > 0) {
        const cols = item.data[0].length;
        item.data = [...item.data, Array(cols).fill('')];
        newContent[contentIndex] = item;
      }
      return newContent;
    });
  };

  const addTableColumn = (contentIndex: number) => {
    setManualContent(prev => {
      const newContent = [...prev];
      const item = { ...newContent[contentIndex] };
      if (item.data) {
        item.data = item.data.map(row => [...row, '']);
        newContent[contentIndex] = item;
      }
      return newContent;
    });
  };

  const removeTableRow = (contentIndex: number, rowIndex: number) => {
    setManualContent(prev => {
      const newContent = [...prev];
      const item = { ...newContent[contentIndex] };
      if (item.data && item.data.length > 1) {
        item.data = item.data.filter((_, i) => i !== rowIndex);
        newContent[contentIndex] = item;
      }
      return newContent;
    });
  };

  const handleSave = async () => {
    if (!selectedDraft) return;

    setSaving(true);
    setError(null);

    try {
      await api.generation.manualContent.update(selectedDraft.id, manualContent);
      setSuccess('تم حفظ المحتوى بنجاح');
      
      // Update the draft in axes state
      setAxes(prev => prev.map(axis => ({
        ...axis,
        drafts: axis.drafts.map(d => 
          d.id === selectedDraft.id 
            ? { ...d, manual_content: manualContent }
            : d
        )
      })));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getAttachmentById = (attachmentId: string): Attachment | undefined => {
    return attachments.find(a => a.id === attachmentId);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🖼️ إضافة محتوى يدوي
        </h1>
        <p className="text-gray-600">
          أضف صور وجداول ونصوص يدوية للبنود في التقرير
        </p>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              فترة الجمع
            </label>
            <select
              value={selectedPeriod || ''}
              onChange={(e) => {
                setSelectedPeriod(parseInt(e.target.value));
                setSelectedDraft(null);
              }}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">اختر فترة...</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.academic_year})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-left">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4">
          {success}
          <button onClick={() => setSuccess(null)} className="float-left">✕</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      )}

      {/* Main Content */}
      {!loading && selectedPeriod && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-semibold">
                البنود
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {axes.map((axis) => (
                  <div key={axis.axis_id}>
                    <div className="bg-gray-100 px-3 py-2 text-sm font-medium border-b">
                      {axis.axis_code}. {axis.axis_name}
                    </div>
                    {axis.drafts.map((draft) => (
                      <button
                        key={draft.id}
                        onClick={() => setSelectedDraft(draft)}
                        className={`w-full text-right px-3 py-2 border-b hover:bg-blue-50 flex items-center justify-between ${
                          selectedDraft?.id === draft.id ? 'bg-blue-100' : ''
                        }`}
                      >
                        <span className="truncate">
                          <span className="text-blue-600 font-medium">{draft.item_code}</span>
                          {' '}
                          <span className="text-sm text-gray-600">{draft.item_name}</span>
                        </span>
                        {draft.manual_content && draft.manual_content.length > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {draft.manual_content.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Editor */}
          <div className="lg:col-span-2">
            {selectedDraft ? (
              <div className="bg-white rounded-lg shadow">
                {/* Draft Header */}
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-lg">
                    {selectedDraft.item_code}. {selectedDraft.item_name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedDraft.axis_name}
                  </p>
                </div>

                {/* Upload Area */}
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium mb-3">📁 رفع ملفات</h3>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    {uploading ? '⏳ جاري الرفع...' : '📤 رفع صور'}
                  </button>

                  {/* Attachments Grid */}
                  {attachments.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-3">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="relative group">
                          <img
                            src={attachment.file_url}
                            alt={attachment.filename}
                            className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                            onClick={() => addImageToContent(attachment)}
                            title="انقر لإضافة للمحتوى"
                          />
                          <button
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100"
                          >
                            ✕
                          </button>
                          <span className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                            +
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Content Buttons */}
                <div className="p-4 border-b flex gap-2">
                  <button
                    onClick={addTableToContent}
                    className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                  >
                    📊 إضافة جدول
                  </button>
                  <button
                    onClick={addTextToContent}
                    className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                  >
                    📝 إضافة نص
                  </button>
                </div>

                {/* Content Items */}
                <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                  {manualContent.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-4xl mb-2">📭</p>
                      <p>لا يوجد محتوى يدوي</p>
                      <p className="text-sm">أضف صور أو جداول أو نصوص</p>
                    </div>
                  ) : (
                    manualContent.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        {/* Item Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {item.type === 'image' && '🖼️ صورة'}
                            {item.type === 'table' && '📊 جدول'}
                            {item.type === 'text' && '📝 نص'}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => moveContentItem(index, 'up')}
                              disabled={index === 0}
                              className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-30"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveContentItem(index, 'down')}
                              disabled={index === manualContent.length - 1}
                              className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-30"
                            >
                              ▼
                            </button>
                            <button
                              onClick={() => removeContentItem(index)}
                              className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Image Content */}
                        {item.type === 'image' && item.attachment_id && (
                          <div>
                            {(() => {
                              const attachment = getAttachmentById(item.attachment_id);
                              return attachment ? (
                                <img
                                  src={attachment.file_url}
                                  alt={item.caption}
                                  className="max-h-40 rounded-lg mx-auto"
                                />
                              ) : (
                                <p className="text-red-500 text-sm">الصورة غير موجودة</p>
                              );
                            })()}
                            <input
                              type="text"
                              placeholder="وصف الصورة..."
                              value={item.caption || ''}
                              onChange={(e) => updateContentItem(index, { caption: e.target.value })}
                              className="mt-2 w-full p-2 border rounded text-sm"
                            />
                          </div>
                        )}

                        {/* Table Content */}
                        {item.type === 'table' && item.data && (
                          <div>
                            <input
                              type="text"
                              placeholder="عنوان الجدول"
                              value={item.title || ''}
                              onChange={(e) => updateContentItem(index, { title: e.target.value })}
                              className="w-full p-2 border rounded text-sm mb-2"
                            />
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <tbody>
                                  {item.data.map((row, rowIdx) => (
                                    <tr key={rowIdx}>
                                      {row.map((cell, colIdx) => (
                                        <td key={colIdx} className="border p-1">
                                          <input
                                            type="text"
                                            value={cell}
                                            onChange={(e) => updateTableCell(index, rowIdx, colIdx, e.target.value)}
                                            className={`w-full p-1 text-center ${rowIdx === 0 ? 'font-bold bg-gray-100' : ''}`}
                                          />
                                        </td>
                                      ))}
                                      {rowIdx > 0 && (
                                        <td className="w-8">
                                          <button
                                            onClick={() => removeTableRow(index, rowIdx)}
                                            className="text-red-500 text-xs"
                                          >
                                            ✕
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => addTableRow(index)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                + صف
                              </button>
                              <button
                                onClick={() => addTableColumn(index)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                + عمود
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Text Content */}
                        {item.type === 'text' && (
                          <textarea
                            placeholder="أدخل النص هنا..."
                            value={item.content || ''}
                            onChange={(e) => updateContentItem(index, { content: e.target.value })}
                            className="w-full p-2 border rounded text-sm min-h-[80px]"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Save Button */}
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-6 py-2 rounded-lg text-white ${
                      saving
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {saving ? '⏳ جاري الحفظ...' : '💾 حفظ المحتوى'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <p className="text-6xl mb-4">👈</p>
                <p>اختر بنداً من القائمة لإضافة محتوى يدوي</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !selectedPeriod && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-6xl mb-4">📄</p>
          <p>اختر فترة جمع للبدء</p>
        </div>
      )}
    </div>
  );
}
