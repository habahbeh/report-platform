'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  Menu,
  Globe,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Home,
} from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const pathConfig: Record<string, string> = {
  '/dashboard': 'الرئيسية',
  '/dashboard/projects': 'المشاريع',
  '/dashboard/templates': 'القوالب',
  '/dashboard/settings': 'الإعدادات',
};

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: 'الرئيسية', href: '/dashboard' }];

  if (pathname === '/dashboard') return crumbs;

  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    currentPath += '/' + segments[i];
    if (currentPath === '/dashboard') continue; // already in crumbs[0]
    const label = pathConfig[currentPath];
    if (label) {
      crumbs.push({
        label,
        href: i < segments.length - 1 ? currentPath : undefined,
      });
    }
  }

  return crumbs;
}

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const pathname = usePathname();
  const { language, setLanguage, dir } = useTranslation();
  const breadcrumbs = getBreadcrumbs(pathname || '/dashboard');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Mobile Menu */}
        <button
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-gray-300 dark:text-gray-600">
                  {dir === 'rtl' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </span>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                    "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {index === 0 && <Home size={14} />}
                  {crumb.label}
                </Link>
              ) : (
                <span className="px-2 py-1 font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-md">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
            title={language === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
          >
            <Globe size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
