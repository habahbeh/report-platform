'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Bell,
  Search,
  Plus,
  Menu,
  HelpCircle,
} from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const pathMap: Record<string, string> = {
  '/dashboard': 'لوحة التحكم',
  '/dashboard/templates': 'القوالب',
  '/dashboard/templates/structure': 'المحاور والبنود',
  '/dashboard/templates/entities': 'الجهات',
  '/dashboard/projects': 'المشاريع',
  '/dashboard/projects/new': 'مشروع جديد',
  '/dashboard/data': 'البيانات',
  '/dashboard/data/periods': 'فترات الجمع',
  '/dashboard/data/submissions': 'تسليمات الجهات',
  '/dashboard/data/files': 'الملفات',
  '/dashboard/data/entities': 'الجهات',
  '/dashboard/data/review': 'المراجعة',
  '/dashboard/review': 'المراجعة',
  '/dashboard/review/data': 'مراجعة البيانات',
  '/dashboard/review/content': 'مراجعة المحتوى',
  '/dashboard/generate': 'توليد AI',
  '/dashboard/drafts': 'المسودات',
  '/dashboard/export': 'تصدير التقرير',
  '/dashboard/reports': 'التقارير',
  '/dashboard/settings': 'الإعدادات',
  '/dashboard/content/manual': 'المحتوى اليدوي',
  '/dashboard/import': 'استيراد البيانات',
  '/dashboard/ai': 'إعدادات AI',
};

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: 'الرئيسية', href: '/' }];

  if (pathname === '/') return crumbs;

  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    currentPath += '/' + segments[i];
    const label = pathMap[currentPath];
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
  const breadcrumbs = getBreadcrumbs(pathname || '/');

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
              {index > 0 && <span className="text-muted-foreground">/</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>

        {/* Search */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="بحث..."
              className="pe-10 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            <span className="absolute top-2 end-2 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          <Button variant="ghost" size="icon">
            <HelpCircle size={20} />
          </Button>

          <Button asChild className="hidden sm:flex gradient-primary shadow-lg shadow-blue-500/20">
            <Link href="/dashboard/projects/new">
              <Plus size={18} />
              <span>مشروع جديد</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
