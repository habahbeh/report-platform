'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Loader2, CheckCircle, FileType, File, BookOpen } from 'lucide-react';

interface Item {
  id: string;
  code: string;
  name: string;
  axis: string | null;
}

interface DownloadFile {
  url: string;
  filename: string;
  size: number;
}

interface GenerateResult {
  success: boolean;
  message?: string;
  item?: { code: string; name: string };
  project: { id: string; name: string };
  stats?: { axes: number; items: number; texts: number; tables: number; figures: number };
  downloads: {
    html?: DownloadFile;
    docx?: DownloadFile;
    pdf?: DownloadFile;
  };
}

export default function GeneratePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [format, setFormat] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string>('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_URL}/api/export/items/`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedItem) {
      setError('الرجاء اختيار بند');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/export/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_code: selectedItem,
          format: format,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل التوليد');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFullReport = async () => {
    setLoadingFull(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/export/generate-full/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: format,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل التوليد');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoadingFull(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'html':
        return <FileType className="w-5 h-5 text-orange-500" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'pdf':
        return <File className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText className="w-7 h-7 text-primary" />
        توليد التقرير
      </h1>

      {/* Generate Full Report - Main Action */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-bold">توليد التقرير الكامل</h2>
            <p className="text-white/80 text-sm">جميع المحاور والبنود في ملف واحد</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="p-3 border rounded-lg text-gray-800 min-w-[200px]"
          >
            <option value="all">HTML + Word</option>
            <option value="html">HTML فقط</option>
            <option value="docx">Word فقط</option>
          </select>
          
          <button
            onClick={handleGenerateFullReport}
            disabled={loadingFull || loading}
            className="px-8 py-3 bg-white text-primary rounded-lg font-bold
                     hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 shadow-md"
          >
            {loadingFull ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري التوليد...
              </>
            ) : (
              <>
                <BookOpen className="w-5 h-5" />
                توليد التقرير الكامل
              </>
            )}
          </button>
        </div>
        
        <p className="mt-3 text-white/70 text-sm">
          6 محاور • 49 بند • 409 نص • 114 جدول • 17 شكل
        </p>
      </div>

      {/* Or Generate Single Item */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-700">أو توليد بند واحد</h3>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Item Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              اختر البند
            </label>
            {loadingItems ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحميل...
              </div>
            ) : (
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">-- اختر بند --</option>
                {items.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.code}: {item.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={loading || loadingFull || !selectedItem}
              className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg font-medium
                       hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التوليد...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  توليد البند
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="w-6 h-6" />
            <span className="font-medium text-lg">
              {result.message || 'تم التوليد بنجاح!'}
            </span>
          </div>

          {/* Stats for full report */}
          {result.stats && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{result.stats.axes}</p>
                <p className="text-sm text-gray-600">محور</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{result.stats.items}</p>
                <p className="text-sm text-gray-600">بند</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{result.stats.texts}</p>
                <p className="text-sm text-gray-600">نص</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{result.stats.tables}</p>
                <p className="text-sm text-gray-600">جدول</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{result.stats.figures}</p>
                <p className="text-sm text-gray-600">شكل</p>
              </div>
            </div>
          )}

          {/* Item info for single item */}
          {result.item && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">البند:</p>
              <p className="font-medium">{result.item.code}: {result.item.name}</p>
            </div>
          )}

          <h3 className="font-medium mb-3">تحميل الملفات:</h3>
          
          <div className="grid gap-3">
            {Object.entries(result.downloads).map(([type, file]) => (
              <a
                key={type}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 border rounded-lg
                         hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(type)}
                  <div>
                    <p className="font-medium">{file.filename}</p>
                    <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-gray-400 group-hover:text-primary" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
