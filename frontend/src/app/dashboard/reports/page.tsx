'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /dashboard/reports to /dashboard/projects
 * The new system uses "projects" instead of "reports"
 */
export default function ReportsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/projects');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">جاري التحويل للمشاريع...</p>
      </div>
    </div>
  );
}
