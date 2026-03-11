'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface DataFile {
  id: number;
  original_name: string;
  file_name: string;
  entity: number;
  entity_name: string;
  item: number | null;
  item_name: string | null;
  file_type: string;
  parsed_data: any;
  status: string;
  notes: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  approved: { label: 'معتمد', color: 'bg-green-100 text-green-700', icon: '✅' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: '❌' },
  revision_requested: { label: 'يحتاج تعديل', color: 'bg-orange-100 text-orange-700', icon: '🔄' },
};

export default function DataReviewPage() {
  const [files, setFiles] = useState<DataFile[]>([]);
  const [allFiles, setAllFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (filter === 'all') {
      setFiles(allFiles);
    } else {
      setFiles(allFiles.filter(f => f.status === filter));
    }
  }, [filter, allFiles]);

  async function loadFiles() {
    try {
      const data = await api.data.files.list({ current: true });
      const fileList = data.results || data || [];
      setAllFiles(fileList);
      setFiles(fileList.filter((f: DataFile) => f.status === 'pending'));
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: number) {
    try {
      await api.data.files.approve(id);
      loadFiles();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  }

  async function handleReject(id: number, notes: string) {
    try {
      await api.data.files.reject(id, notes);
      loadFiles();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  }

  async function handleRequestRevision(id: number, notes: string) {
    try {
      await api.data.files.requestRevision(id, notes);
      loadFiles();
    } catch (error) {
      console.error('Failed to request revision:', error);
    }
  }

  async function handleBulkAction() {
    if (!bulkAction || selectedFiles.size === 0) return;

    const ids = Array.from(selectedFiles);
    try {
      if (bulkAction === 'approve') {
        await Promise.all(ids.map(id => api.data.files.approve(id)));
      } else if (bulkAction === 'reject') {
        await Promise.all(ids.map(id => api.data.files.reject(id, 'مرفوض بالجملة')));
      }
      setSelectedFiles(new Set());
      setBulkAction('');
      loadFiles();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  }

  const stats = {
    pending: allFiles.filter(f => f.status === 'pending').length,
    approved: allFiles.filter(f => f.status === 'approved').length,
    rejected: allFiles.filter(f => f.status === 'rejected').length,
    revision_requested: allFiles.filter(f => f.status === 'revision_requested').length,
  };

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
            <span>👁️</span>
            <span>مراجعة الملفات</span>
          </h1>
          <p className="text-gray-500 mt-1">
            مراجعة واعتماد الملفات المرفوعة من الجهات
          </p>
        </div>
        <Link href="/dashboard/data/files" className="btn btn-secondary">
          📁 كل الملفات
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { key: 'pending', label: 'قيد الانتظار', count: stats.pending, icon: '⏳', color: 'yellow' },
          { key: 'approved', label: 'معتمد', count: stats.approved, icon: '✅', color: 'green' },
          { key: 'rejected', label: 'مرفوض', count: stats.rejected, icon: '❌', color: 'red' },
          { key: 'revision_requested', label: 'يحتاج تعديل', count: stats.revision_requested, icon: '🔄', color: 'orange' },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setFilter(stat.key)}
            className={`card text-center transition-all hover:shadow-md ${
              filter === stat.key ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="text-3xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedFiles.size > 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-700">
              {selectedFiles.size} ملف محدد
            </span>
            <div className="flex items-center gap-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="input text-sm"
              >
                <option value="">اختر إجراء...</option>
                <option value="approve">✅ اعتماد الكل</option>
                <option value="reject">❌ رفض الكل</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="btn btn-primary text-sm"
              >
                تنفيذ
              </button>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="btn btn-secondary text-sm"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">👁️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد ملفات للمراجعة</h3>
          <p className="text-gray-500">
            {filter === 'pending'
              ? 'جميع الملفات تم مراجعتها'
              : 'لا توجد ملفات في هذه الحالة'
            }
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === files.length && files.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFiles(new Set(files.map(f => f.id)));
                      } else {
                        setSelectedFiles(new Set());
                      }
                    }}
                    className="w-5 h-5 rounded"
                  />
                </th>
                <th className="text-right p-4 font-medium text-gray-600">اسم الملف</th>
                <th className="text-right p-4 font-medium text-gray-600">الجهة</th>
                <th className="text-right p-4 font-medium text-gray-600">البند</th>
                <th className="text-right p-4 font-medium text-gray-600">تاريخ الرفع</th>
                <th className="text-right p-4 font-medium text-gray-600">الحالة</th>
                <th className="text-right p-4 font-medium text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map((file) => {
                const fileStatus = statusConfig[file.status] || statusConfig.pending;
                return (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedFiles);
                          if (e.target.checked) {
                            newSelected.add(file.id);
                          } else {
                            newSelected.delete(file.id);
                          }
                          setSelectedFiles(newSelected);
                        }}
                        className="w-5 h-5 rounded"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">
                        📄 {file.original_name || file.file_name}
                      </div>
                      <div className="text-sm text-gray-500">{file.file_type}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{file.entity_name}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-700">{file.item_name || '—'}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(file.uploaded_at).toLocaleDateString('ar')}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${fileStatus.color}`}>
                        {fileStatus.icon} {fileStatus.label}
                      </span>
                    </td>
                    <td className="p-4">
                      {file.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(file.id)}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                          >
                            ✅ اعتماد
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('ملاحظات للتعديل:');
                              if (notes) handleRequestRevision(file.id, notes);
                            }}
                            className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200"
                          >
                            🔄 تعديل
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('سبب الرفض:');
                              if (notes) handleReject(file.id, notes);
                            }}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                          >
                            ❌ رفض
                          </button>
                        </div>
                      )}
                      {file.status === 'rejected' && file.notes && (
                        <div className="text-sm text-red-600">
                          {file.notes}
                        </div>
                      )}
                      {file.status === 'revision_requested' && file.notes && (
                        <div className="text-sm text-orange-600">
                          {file.notes}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
