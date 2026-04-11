'use client';

import Link from 'next/link';
import { Home, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6" dir="rtl">
      <div className="text-center max-w-md">
        {/* Number */}
        <div className="relative mb-8">
          <div className="text-[10rem] font-black text-gray-100 dark:text-gray-800 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Home className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          الصفحة غير موجودة
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          يبدو أن الصفحة التي تبحث عنها لا وجود لها أو تم نقلها.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
          >
            <Home className="w-5 h-5" />
            العودة للرئيسية
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-blue-300 dark:hover:border-blue-700 transition-all"
          >
            <ArrowRight className="w-5 h-5" />
            الصفحة السابقة
          </button>
        </div>
      </div>
    </div>
  );
}
