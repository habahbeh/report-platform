'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { api, getAuthToken, setAuthToken } from '@/lib/api';
import { useTranslation } from '@/contexts/LanguageContext';

interface User {
  id: number;
  username: string;
  email: string;
  name_ar?: string;
  display_name: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { t, dir } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    api.auth.me()
      .then(setUser)
      .catch(() => {
        setAuthToken(null);
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore
    }
    setAuthToken(null);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-blue-500/30 animate-pulse-slow">
            {dir === 'rtl' ? 'ت' : 'T'}
          </div>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar
          user={user}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          onLogout={handleLogout}
        />
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out bg-white dark:bg-gray-900 shadow-2xl',
          dir === 'rtl' ? 'right-0' : 'left-0',
          mobileMenuOpen
            ? 'translate-x-0'
            : dir === 'rtl'
            ? 'translate-x-full'
            : '-translate-x-full'
        )}
      >
        <Sidebar
          user={user}
          collapsed={false}
          onCollapse={() => {}}
          onLogout={() => {
            setMobileMenuOpen(false);
            handleLogout();
          }}
          isMobile={true}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300 min-h-screen',
          sidebarCollapsed ? 'lg:ps-[80px]' : 'lg:ps-[280px]'
        )}
      >
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="p-4 lg:p-6 animate-fade-in overflow-x-hidden">
          {children}
        </main>

        <footer className="px-4 lg:px-6 py-4 text-center text-sm text-muted-foreground border-t">
          {t.app.name} © 2024 - {t.app.tagline}
        </footer>
      </div>
    </div>
  );
}
