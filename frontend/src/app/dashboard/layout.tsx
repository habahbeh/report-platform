'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </LanguageProvider>
  );
}
