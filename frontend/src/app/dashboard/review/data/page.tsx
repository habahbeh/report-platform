'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem, ScaleHover } from '@/components/ui/motion';
import { FileCheck, Clock, CheckCircle, XCircle, RotateCcw, Filter, Check, X, Loader2, FileText, Building2, Eye } from 'lucide-react';

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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400', icon: Clock },
  approved: { label: 'معتمد', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400', icon: XCircle },
  revision_requested: { label: 'يحتاج تعديل', color: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400', icon: RotateCcw },
};

export default function DataReviewPage() {
  const [files, setFiles] = useState<DataFile[]>([]);
  const [allFiles, setAllFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());

  useEffect(() => { loadFiles(); }, []);
  useEffect(() => {
    if (filter === 'all') setFiles(allFiles);
    else setFiles(allFiles.filter(f => f.status === filter));
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
    try { await api.data.files.approve(id); loadFiles(); } catch (error) { console.error('Failed to approve:', error); }
  }

  async function handleReject(id: number) {
    const notes = prompt('سبب الرفض:');
    if (!notes) return;
    try { await api.data.files.reject(id, notes); loadFiles(); } catch (error) { console.error('Failed to reject:', error); }
  }

  async function handleBulkApprove() {
    if (selectedFiles.size === 0) return;
    try {
      await Promise.all(Array.from(selectedFiles).map(id => api.data.files.approve(id)));
      setSelectedFiles(new Set());
      loadFiles();
    } catch (error) {
      console.error('Failed to bulk approve:', error);
    }
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedFiles(newSelected);
  };

  const selectAll = () => {
    if (selectedFiles.size === files.length) setSelectedFiles(new Set());
    else setSelectedFiles(new Set(files.map(f => f.id)));
  };

  const pendingCount = allFiles.filter(f => f.status === 'pending').length;

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FileCheck className="w-7 h-7 text-blue-600" />
                <span>مراجعة الملفات</span>
                {pendingCount > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded-full text-sm">{pendingCount} قيد الانتظار</span>
                )}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">مراجعة واعتماد الملفات المرفوعة من الجهات</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-wrap items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            {['pending', 'approved', 'rejected', 'all'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {f === 'pending' ? 'قيد الانتظار' : f === 'approved' ? 'معتمد' : f === 'rejected' ? 'مرفوض' : 'الكل'}
              </button>
            ))}
            <div className="flex-1" />
            {selectedFiles.size > 0 && filter === 'pending' && (
              <button onClick={handleBulkApprove} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
                <CheckCircle className="w-4 h-4" />
                اعتماد المحدد ({selectedFiles.size})
              </button>
            )}
          </div>
        </FadeIn>

        {files.length === 0 ? (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
              <FileCheck className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">لا توجد ملفات</h3>
              <p className="text-gray-500 dark:text-gray-400">{filter === 'pending' ? 'لا توجد ملفات قيد الانتظار' : 'لا توجد ملفات بهذه الحالة'}</p>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
                <button onClick={selectAll} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  {selectedFiles.size === files.length ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 border-2 rounded" />}
                  تحديد الكل
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">{files.length} ملف</span>
              </div>
              <StaggerContainer className="divide-y divide-gray-100 dark:divide-gray-800">
                {files.map((file) => {
                  const config = statusConfig[file.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  const isSelected = selectedFiles.has(file.id);
                  return (
                    <StaggerItem key={file.id}>
                      <div className={`p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <button onClick={() => toggleSelect(file.id)} className="flex-shrink-0">
                          {isSelected ? <Check className="w-5 h-5 text-blue-600" /> : <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded" />}
                        </button>
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">{file.original_name || file.file_name}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {file.entity_name}</span>
                            {file.item_name && <span>{file.item_name}</span>}
                          </div>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
                          <StatusIcon className="w-3 h-3" /> {config.label}
                        </span>
                        <div className="flex gap-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg"><Eye className="w-4 h-4" /></button>
                          {file.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(file.id)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg"><Check className="w-4 h-4" /></button>
                              <button onClick={() => handleReject(file.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg"><X className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
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
