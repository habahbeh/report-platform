'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  Bell,
  Search,
  Menu,
  HelpCircle,
  Globe,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Home,
} from 'lucide-react';

interface BreadcrumbItem {
  labelKey: string;
  href?: string;
}

const pathConfig: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/dashboard/templates': 'templates',
  '/dashboard/templates/structure': 'structure',
  '/dashboard/templates/entities': 'entities',
  '/dashboard/data': 'data',
  '/dashboard/data/periods': 'periods',
  '/dashboard/data/submissions': 'submissions',
  '/dashboard/data/files': 'files',
  '/dashboard/data/entities': 'entities',
  '/dashboard/review': 'review',
  '/dashboard/review/data': 'dataReview',
  '/dashboard/review/content': 'contentReview',
  '/dashboard/generate': 'aiGeneration',
  '/dashboard/drafts': 'drafts',
  '/dashboard/export': 'exportReport',
  '/dashboard/reports': 'reports',
  '/dashboard/settings': 'settings',
  '/dashboard/content/manual': 'manualContent',
  '/dashboard/import': 'importData',
};

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ labelKey: 'home', href: '/dashboard' }];

  if (pathname === '/dashboard') return crumbs;

  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    currentPath += '/' + segments[i];
    const labelKey = pathConfig[currentPath];
    if (labelKey) {
      crumbs.push({
        labelKey,
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
  const { t, language, setLanguage, dir } = useTranslation();
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

  const getBreadcrumbLabel = (key: string): string => {
    const labels: Record<string, string> = {
      home: t.nav.main,
      dashboard: t.navItems.dashboard,
      templates: t.navItems.templates,
      structure: t.navItems.structure,
      entities: t.navItems.entities,
      data: t.nav.dataCollection,
      periods: t.navItems.periods,
      submissions: t.navItems.submissions,
      files: t.navItems.files,
      review: t.nav.review,
      dataReview: t.navItems.dataReview,
      contentReview: t.navItems.contentReview,
      aiGeneration: t.navItems.aiGeneration,
      drafts: t.navItems.drafts,
      exportReport: t.navItems.exportReport,
      reports: t.navItems.reports,
      settings: t.navItems.settings,
      manualContent: t.navItems.manualContent,
      importData: t.navItems.importData,
    };
    return labels[key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Mobile Menu */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </Button>

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
                  {getBreadcrumbLabel(crumb.labelKey)}
                </Link>
              ) : (
                <span className="px-2 py-1 font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-md">
                  {getBreadcrumbLabel(crumb.labelKey)}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Search */}
        <div className="hidden lg:flex items-center flex-1 max-w-sm mx-6">
          <div className="relative w-full group">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <Input
              placeholder={t.common.search}
              className="ps-10 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </Button>

          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            title={language === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
          >
            <Globe size={20} />
          </Button>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <Bell size={20} />
            <span className="absolute top-2 end-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </Button>

          {/* Help */}
          <Button 
            variant="ghost" 
            size="icon"
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <HelpCircle size={20} />
          </Button>

          {/* New Period Button */}
          <Button asChild className="hidden sm:flex ms-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 rounded-xl">
            <Link href="/dashboard/data/periods">
              <Calendar size={18} className="me-2" />
              <span>{t.navItems.newPeriod}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
