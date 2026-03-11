'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface DataFile {
  id: number;
  entity_name: string;
  entity_code: string;
  original_name?: string;
  file_name?: string;
  file_type: string;
  file_size: number;
  status: string;
  uploaded_at: string;
  uploaded_by: string;
  parsed_data: any | null;
  notes: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  parsing: { label: 'جاري المعالجة', color: 'bg-blue-100 text-blue-700', icon: '⚙️' },
  parsed: { label: 'تم التحليل', color: 'bg-green-100 text-green-700', icon: '✅' },
  approved: { label: 'معتمد', color: 'bg-green-100 text-green-700', icon: '✓' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: '❌' },
  error: { label: 'خطأ', color: 'bg-red-100 text-red-700', icon: '⚠️' },
};

const fileTypeIcons: Record<string, string> = {
  xlsx: '📊',
  xls: '📊',
  csv: '📄',
  pdf: '📕',
  doc: '📘',
  docx: '📘',
  default: '📎',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DataFilesPage() {
  const [files, setFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      const data = await api.data.files.list();
      setFiles(data.results || data || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredFiles =
    filter === 'all' ? files : files.filter((f) => f.status === filter);

  const stats = {
    total: files.length,
    pending: files.filter((f) => f.status === 'pending').length,
    parsed: files.filter((f) => f.status === 'parsed').length,
    approved: files.filter((f) => f.status === 'approved').length,
    rejected: files.filter((f) => f.status === 'rejected').length,
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
            <span>📎</span>
            <span>الملفات المرفوعة</span>
          </h1>
          <p className="text-gray-500 mt-1">
            إدارة ومراجعة الملفات المرفوعة من الجهات
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'الكل', count: stats.total, icon: '📎', color: 'blue' },
          { key: 'pending', label: 'قيد الانتظار', count: stats.pending, icon: '⏳', color: 'yellow' },
          { key: 'parsed', label: 'تم التحليل', count: stats.parsed, icon: '✅', color: 'green' },
          { key: 'approved', label: 'معتمد', count: stats.approved, icon: '✓', color: 'green' },
          { key: 'rejected', label: 'مرفوض', count: stats.rejected, icon: '❌', color: 'red' },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setFilter(stat.key)}
            className={`card text-center transition-all hover:shadow-md ${
              filter === stat.key ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </button>
        ))}
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📎</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد ملفات</h3>
          <p className="text-gray-500">
            {filter !== 'all'
              ? 'لا توجد ملفات في هذه الحالة'
              : 'لم يتم رفع أي ملفات بعد'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-4 font-medium text-gray-600">الملف</th>
                <th className="text-right p-4 font-medium text-gray-600">الجهة</th>
                <th className="text-right p-4 font-medium text-gray-600">الحجم</th>
                <th className="text-right p-4 font-medium text-gray-600">الحالة</th>
                <th className="text-right p-4 font-medium text-gray-600">تاريخ الرفع</th>
                <th className="text-right p-4 font-medium text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFiles.map((file) => {
                const status = statusConfig[file.status] || statusConfig.pending;
                const fileExt = (file.original_name || file.file_name || '').split('.').pop()?.toLowerCase() || '';
                const fileIcon = fileTypeIcons[fileExt] || fileTypeIcons.default;

                return (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{fileIcon}</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {file.original_name || file.file_name || 'ملف'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {file.file_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">
                        {file.entity_name}
                      </div>
                      <div className="text-sm text-gray-500">{file.entity_code}</div>
                    </td>
                    <td className="p-4 text-gray-600">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}
                      >
                        {status.icon} {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(file.uploaded_at).toLocaleDateString('ar')}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                          عرض
                        </button>
                        {file.status === 'pending' && (
                          <button className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200">
                            تحليل
                          </button>
                        )}
                      </div>
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
