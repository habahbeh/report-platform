'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  Bell,
  Search,
  Plus,
  Menu,
  HelpCircle,
  Globe,
  Calendar,
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
    <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur-xl">
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
        <nav className="hidden md:flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-muted-foreground">
                  {dir === 'rtl' ? '←' : '→'}
                </span>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {getBreadcrumbLabel(crumb.labelKey)}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {getBreadcrumbLabel(crumb.labelKey)}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Search */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder={t.common.search}
              className="pe-10 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            title={language === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
          >
            <Globe size={20} />
          </Button>

          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            <span className="absolute top-2 end-2 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          <Button variant="ghost" size="icon">
            <HelpCircle size={20} />
          </Button>

          <Button asChild className="hidden sm:flex gradient-primary shadow-lg shadow-blue-500/20">
            <Link href="/dashboard/data/periods">
              <Calendar size={18} />
              <span>{t.navItems.newPeriod}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
