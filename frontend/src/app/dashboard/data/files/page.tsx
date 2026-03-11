'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem, ScaleHover } from '@/components/ui/motion';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Filter, Download, Trash2, Loader2, Building2, FileSpreadsheet, File } from 'lucide-react';

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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400', icon: Clock },
  parsing: { label: 'جاري المعالجة', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400', icon: Loader2 },
  parsed: { label: 'تم التحليل', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400', icon: CheckCircle },
  approved: { label: 'معتمد', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400', icon: XCircle },
  error: { label: 'خطأ', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400', icon: AlertCircle },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type: string) {
  if (['xlsx', 'xls', 'csv'].includes(type)) return FileSpreadsheet;
  return File;
}

export default function DataFilesPage() {
  const [files, setFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { loadFiles(); }, []);

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

  const filteredFiles = filter === 'all' ? files : files.filter(f => f.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-blue-600" />
              <span>الملفات</span>
              <span className="text-sm font-normal bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg">{files.length}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">جميع الملفات المرفوعة من الجهات</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-wrap items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                {f === 'all' ? 'الكل' : f === 'pending' ? 'قيد الانتظار' : f === 'approved' ? 'معتمد' : 'مرفوض'}
              </button>
            ))}
          </div>
        </FadeIn>

        {filteredFiles.length === 0 ? (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">لا توجد ملفات</h3>
              <p className="text-gray-500 dark:text-gray-400">{filter === 'all' ? 'لم يتم رفع أي ملفات بعد' : 'لا توجد ملفات بهذه الحالة'}</p>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <StaggerContainer className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredFiles.map((file) => {
                  const config = statusConfig[file.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  const FileIcon = getFileIcon(file.file_type);
                  return (
                    <StaggerItem key={file.id}>
                      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                          <FileIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">{file.original_name || file.file_name}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {file.entity_name}</span>
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>{new Date(file.uploaded_at).toLocaleDateString('ar')}</span>
                          </div>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
                          <StatusIcon className="w-3 h-3" /> {config.label}
                        </span>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}
