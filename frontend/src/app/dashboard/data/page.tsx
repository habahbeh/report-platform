'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { api, getAuthToken } from '@/lib/api';

interface Period {
  id: number;
  name: string;
  academic_year: string;
  status: string;
  status_display: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Submission {
  id: number;
  entity: number;
  entity_name: string;
  period: number;
  status: string;
  status_display: string;
  progress_percentage: string;
  total_items: number;
  completed_items: number;
}

interface DataFile {
  id: number;
  name: string;
  entity_name: string | null;
  file_type: string;
  status: string;
  status_display: string;
  version: number;
  is_current: boolean;
  uploaded_at: string;
}

interface Stats {
  active_periods: number;
  total_entities: number;
  total_submissions: number;
  pending_reviews: number;
  approved_submissions: number;
  overall_progress: number;
  by_status: Record<string, number>;
}

export default function DataPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'files'>('overview');
  
  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [files, setFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);
  
  // Portal Links Modal
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [portalLinks, setPortalLinks] = useState<Array<{
    entity_id: number;
    entity_name: string;
    token: string;
    url: string;
    status: string;
  }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadSubmissions();
    }
  }, [selectedPeriod, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, periodsRes, filesRes] = await Promise.all([
        api.data.stats().catch(() => null),
        api.data.periods.list().catch(() => ({ results: [] })),
        api.data.files.list().catch(() => ({ results: [] })),
      ]);
      
      setStats(statsRes);
      setPeriods(periodsRes.results || periodsRes || []);
      setFiles(filesRes.results || filesRes || []);
      
      // Auto-select first active period
      const activePeriod = (periodsRes.results || periodsRes || []).find((p: Period) => p.is_active);
      if (activePeriod) {
        setSelectedPeriod(activePeriod.id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    if (!selectedPeriod) return;
    
    try {
      const params: { period: number; status?: string } = { period: selectedPeriod };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const data = await api.data.submissions.list(params);
      setSubmissions(data.results || data || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  };

  const handleSubmit = async (submissionId: number) => {
    try {
      await api.data.submissions.submit(submissionId);
      loadSubmissions();
      loadData();
    } catch (error) {
      alert('فشل في التسليم');
    }
  };

  const handleApprove = async (submissionId: number) => {
    try {
      await api.data.submissions.approve(submissionId);
      loadSubmissions();
      loadData();
    } catch (error) {
      alert('فشل في الاعتماد');
    }
  };

  const handleRequestRevision = async (submissionId: number) => {
    const notes = prompt('أدخل ملاحظات التعديل:');
    if (notes === null) return;
    
    try {
      await api.data.submissions.requestRevision(submissionId, notes);
      loadSubmissions();
      loadData();
    } catch (error) {
      alert('فشل في طلب التعديل');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubmission) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('file_type', 'excel');
      formData.append('submission', String(selectedSubmission));
      
      // Get entity from submission
      const sub = submissions.find(s => s.id === selectedSubmission);
      if (sub) {
        formData.append('entity', String(sub.entity));
      }
      
      await api.data.files.upload(formData);
      
      loadSubmissions();
      loadData();
      setSelectedSubmission(null);
    } catch (error) {
      alert('فشل في رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const loadPortalLinks = async () => {
    if (!selectedPeriod) {
      alert('اختر فترة أولاً');
      return;
    }
    try {
      const res = await api.data.submissions.portalLinks(selectedPeriod);
      setPortalLinks(res.links || []);
      setShowLinksModal(true);
    } catch (error) {
      alert('فشل في تحميل الروابط');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم النسخ!');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'not_started': 'bg-gray-100 text-gray-700',
      'in_progress': 'bg-blue-100 text-blue-700',
      'submitted': 'bg-yellow-100 text-yellow-700',
      'under_review': 'bg-purple-100 text-purple-700',
      'approved': 'bg-green-100 text-green-700',
      'needs_revision': 'bg-red-100 text-red-700',
      'open': 'bg-green-100 text-green-700',
      'closed': 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 جمع البيانات</h1>
          <p className="text-gray-600 mt-1">متابعة تسليمات الجهات وإدارة الملفات</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Quick Links */}
          <button
            onClick={loadPortalLinks}
            className="btn bg-green-500 text-white hover:bg-green-600"
          >
            🔗 روابط البوابات
          </button>
          <Link
            href="/dashboard/data/review"
            className="btn bg-yellow-500 text-white hover:bg-yellow-600"
          >
            🔍 المراجعة ({stats?.pending_reviews || 0})
          </Link>
          <Link
            href="/dashboard/data/entities"
            className="btn bg-purple-500 text-white hover:bg-purple-600"
          >
            🏢 الجهات
          </Link>
          
          {/* Period selector */}
          {periods.length > 0 && (
            <select
              value={selectedPeriod || ''}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="input"
            >
              {periods.map(period => (
                <option key={period.id} value={period.id}>
                  {period.name} ({period.academic_year})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.total_entities}</p>
            <p className="text-sm text-gray-600">إجمالي الجهات</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.by_status?.not_started || 0}</p>
            <p className="text-sm text-gray-600">لم يبدأ</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.pending_reviews}</p>
            <p className="text-sm text-gray-600">بانتظار المراجعة</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{stats.approved_submissions}</p>
            <p className="text-sm text-gray-600">معتمد</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600">{Math.round(stats.overall_progress)}%</p>
            <p className="text-sm text-gray-600">التقدم الكلي</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: '📈' },
            { id: 'submissions', label: 'التسليمات', icon: '📋' },
            { id: 'files', label: 'الملفات', icon: '📁' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Progress by Status */}
          <div className="card">
            <h3 className="font-medium text-gray-900 mb-4">📊 التوزيع حسب الحالة</h3>
            <div className="space-y-3">
              {[
                { key: 'not_started', label: 'لم يبدأ', color: 'bg-gray-500' },
                { key: 'in_progress', label: 'قيد العمل', color: 'bg-blue-500' },
                { key: 'submitted', label: 'مُسلَّم', color: 'bg-yellow-500' },
                { key: 'approved', label: 'معتمد', color: 'bg-green-500' },
                { key: 'needs_revision', label: 'يحتاج تعديل', color: 'bg-red-500' },
              ].map(item => {
                const count = stats?.by_status?.[item.key] || 0;
                const total = stats?.total_submissions || 1;
                const percentage = (count / total) * 100;
                
                return (
                  <div key={item.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.label}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Period Info */}
          {selectedPeriod && periods.length > 0 && (
            <div className="card">
              <h3 className="font-medium text-gray-900 mb-4">📅 فترة الجمع الحالية</h3>
              {(() => {
                const period = periods.find(p => p.id === selectedPeriod);
                if (!period) return null;
                
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{period.name}</p>
                      <p className="text-gray-600">{period.academic_year}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">تاريخ البدء</p>
                        <p className="font-medium">{formatDate(period.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">تاريخ الانتهاء</p>
                        <p className="font-medium">{formatDate(period.end_date)}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(period.status)}`}>
                        {period.status_display}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="card">
          {/* Filter */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">📋 تسليمات الجهات</h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">جميع الحالات</option>
              <option value="not_started">لم يبدأ</option>
              <option value="in_progress">قيد العمل</option>
              <option value="submitted">مُسلَّم</option>
              <option value="approved">معتمد</option>
              <option value="needs_revision">يحتاج تعديل</option>
            </select>
          </div>

          {/* Submissions Table */}
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>الجهة</th>
                  <th>الحالة</th>
                  <th>التقدم</th>
                  <th>الملفات</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="font-medium">
                      <Link
                        href={`/dashboard/data/submissions/${sub.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {sub.entity_name}
                      </Link>
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(sub.status)}`}>
                        {sub.status_display}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${sub.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{Math.round(parseFloat(sub.progress_percentage))}%</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedSubmission(sub.id);
                          fileInputRef.current?.click();
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        disabled={uploading}
                      >
                        📤 رفع ملف
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {sub.status === 'in_progress' && (
                          <button
                            onClick={() => handleSubmit(sub.id)}
                            className="btn btn-sm bg-yellow-500 text-white hover:bg-yellow-600"
                          >
                            تسليم
                          </button>
                        )}
                        {sub.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleApprove(sub.id)}
                              className="btn btn-sm bg-green-500 text-white hover:bg-green-600"
                            >
                              اعتماد
                            </button>
                            <button
                              onClick={() => handleRequestRevision(sub.id)}
                              className="btn btn-sm bg-red-500 text-white hover:bg-red-600"
                            >
                              تعديل
                            </button>
                          </>
                        )}
                        {sub.status === 'approved' && (
                          <span className="text-green-600 text-sm">✅ معتمد</span>
                        )}
                        {sub.status === 'not_started' && (
                          <span className="text-gray-400 text-sm">بانتظار البيانات</span>
                        )}
                        {sub.status === 'needs_revision' && (
                          <span className="text-red-600 text-sm">⚠️ يحتاج تعديل</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {submissions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد تسليمات للفترة المحددة
            </div>
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-4">📁 الملفات المرفوعة ({files.length})</h3>
          
          {files.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>اسم الملف</th>
                    <th>الجهة</th>
                    <th>النوع</th>
                    <th>الحالة</th>
                    <th>الإصدار</th>
                    <th>تاريخ الرفع</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(file => (
                    <tr key={file.id}>
                      <td className="font-medium">{file.name}</td>
                      <td>{file.entity_name || <span className="text-gray-400">-</span>}</td>
                      <td>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {file.file_type}
                        </span>
                      </td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(file.status)}`}>
                          {file.status_display}
                        </span>
                      </td>
                      <td>
                        {file.is_current ? (
                          <span className="text-green-600">v{file.version} ✓</span>
                        ) : (
                          <span className="text-gray-400">v{file.version}</span>
                        )}
                      </td>
                      <td className="text-gray-500 text-sm">{formatDate(file.uploaded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              لم يتم رفع أي ملفات بعد
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Portal Links Modal */}
      {showLinksModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">🔗 روابط بوابات الجهات</h2>
                <p className="text-sm text-gray-500">روابط مباشرة لكل جهة لرفع بياناتها</p>
              </div>
              <button
                onClick={() => setShowLinksModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {portalLinks.length > 0 ? (
                <div className="space-y-3">
                  {portalLinks.map((link) => (
                    <div
                      key={link.entity_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{link.entity_name}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">{link.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(link.status)}`}>
                          {link.status === 'not_started' ? 'لم يبدأ' :
                           link.status === 'in_progress' ? 'قيد العمل' :
                           link.status === 'submitted' ? 'مُسلَّم' :
                           link.status === 'approved' ? 'معتمد' : link.status}
                        </span>
                        <button
                          onClick={() => copyToClipboard(link.url)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          📋 نسخ
                        </button>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          🔗 فتح
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لا توجد جهات في هذه الفترة
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => {
                  const allLinks = portalLinks.map(l => `${l.entity_name}: ${l.url}`).join('\n');
                  copyToClipboard(allLinks);
                }}
                className="btn bg-blue-600 text-white hover:bg-blue-700"
              >
                📋 نسخ جميع الروابط
              </button>
              <button
                onClick={() => setShowLinksModal(false)}
                className="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
