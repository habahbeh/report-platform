'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Database,
  CheckCircle,
  Sparkles,
  Download,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Plus,
  Building2,
  Layers,
  Calendar,
  FileUp,
  FileCheck,
  PenTool,
  FileOutput,
  Upload,
  FileEdit,
  Bot,
  X,
} from 'lucide-react';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

const navigationConfig: NavGroup[] = [
  {
    titleKey: 'main',
    items: [
      { titleKey: 'dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { titleKey: 'settings', href: '/dashboard/settings', icon: <Settings size={20} /> },
    ],
  },
  {
    titleKey: 'templates',
    items: [
      { titleKey: 'templates', href: '/dashboard/templates', icon: <FileText size={20} /> },
      { titleKey: 'structure', href: '/dashboard/templates/structure', icon: <Layers size={20} /> },
      { titleKey: 'entities', href: '/dashboard/templates/entities', icon: <Building2 size={20} /> },
    ],
  },
  {
    titleKey: 'dataCollection',
    items: [
      { titleKey: 'periods', href: '/dashboard/data/periods', icon: <Calendar size={20} /> },
      { titleKey: 'submissions', href: '/dashboard/data/submissions', icon: <FileUp size={20} /> },
      { titleKey: 'files', href: '/dashboard/data/files', icon: <FileCheck size={20} /> },
      { titleKey: 'importData', href: '/dashboard/import', icon: <Upload size={20} /> },
    ],
  },
  {
    titleKey: 'review',
    items: [
      { titleKey: 'dataReview', href: '/dashboard/review/data', icon: <FileCheck size={20} /> },
      { titleKey: 'contentReview', href: '/dashboard/review/content', icon: <CheckCircle size={20} /> },
    ],
  },
  {
    titleKey: 'generation',
    items: [
      { titleKey: 'aiGeneration', href: '/dashboard/generate', icon: <Sparkles size={20} /> },
      { titleKey: 'drafts', href: '/dashboard/drafts', icon: <PenTool size={20} /> },
      { titleKey: 'manualContent', href: '/dashboard/content/manual', icon: <FileEdit size={20} /> },
    ],
  },
  {
    titleKey: 'export',
    items: [
      { titleKey: 'exportReport', href: '/dashboard/export', icon: <Download size={20} /> },
      { titleKey: 'reports', href: '/dashboard/reports', icon: <FileOutput size={20} /> },
    ],
  },
];

interface SidebarProps {
  user: any;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  onLogout: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ user, collapsed, onCollapse, onLogout, isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, dir } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    navigationConfig.map((g) => g.titleKey)
  );

  // Close sidebar on mobile when clicking a link
  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const toggleGroup = (titleKey: string) => {
    setExpandedGroups((prev) =>
      prev.includes(titleKey) ? prev.filter((k) => k !== titleKey) : [...prev, titleKey]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href) || false;
  };

  const getNavTitle = (key: string): string => {
    const navTitles: Record<string, string> = {
      main: t.nav.main || 'الرئيسية',
      templates: t.nav.templates || 'القوالب',
      dataCollection: t.nav.dataCollection || 'جمع البيانات',
      review: t.nav.review || 'المراجعة',
      generation: t.nav.generation || 'التوليد',
      export: t.nav.export || 'التصدير',
    };
    return navTitles[key] || key;
  };

  const getItemTitle = (key: string): string => {
    return (t.navItems as Record<string, string>)[key] || key;
  };

  // Determine chevron based on direction
  const CollapseIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const ExpandIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'h-screen border-s flex flex-col',
          // Mobile: relative position (parent handles transform)
          // Desktop: fixed position
          isMobile 
            ? 'relative w-[280px] max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl' 
            : cn(
                'fixed top-0 z-40 transition-all duration-300 bg-card',
                dir === 'rtl' ? 'right-0' : 'left-0',
                collapsed ? 'w-[80px]' : 'w-[280px]'
              )
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/" className="flex items-center gap-3" onClick={handleLinkClick}>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
              {dir === 'rtl' ? 'ت' : 'T'}
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-foreground">{t.app.name}</h1>
                <p className="text-xs text-muted-foreground">{t.app.tagline}</p>
              </div>
            )}
          </Link>
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapse(!collapsed)}
              className="text-muted-foreground hover:text-foreground"
            >
              {collapsed ? <ExpandIcon size={18} /> : <CollapseIcon size={18} />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-6">
            {navigationConfig.map((group) => (
              <div key={group.titleKey}>
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.titleKey)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wider hover:text-foreground transition-colors',
                      dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'
                    )}
                  >
                    <ChevronLeft
                      size={14}
                      className={cn(
                        'transition-transform',
                        expandedGroups.includes(group.titleKey) && '-rotate-90',
                        dir === 'ltr' && 'rotate-180',
                        dir === 'ltr' && expandedGroups.includes(group.titleKey) && 'rotate-90'
                      )}
                    />
                    <span>{getNavTitle(group.titleKey)}</span>
                  </button>
                )}

                {(collapsed || expandedGroups.includes(group.titleKey)) && (
                  <div className="space-y-1 mt-1">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      const linkContent = (
                        <Link
                          href={item.href}
                          onClick={handleLinkClick}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                            active
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            collapsed && 'justify-center px-0'
                          )}
                        >
                          {!collapsed && (
                            <>
                              <span className={cn(
                                'flex-1 font-medium text-sm',
                                dir === 'rtl' ? 'text-right' : 'text-left'
                              )}>
                                {getItemTitle(item.titleKey)}
                              </span>
                              {item.badge && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                          <span className={cn(active && 'text-primary-foreground')}>
                            {item.icon}
                          </span>
                        </Link>
                      );

                      if (collapsed) {
                        return (
                          <Tooltip key={item.href}>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
                              <p>{getItemTitle(item.titleKey)}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return <div key={item.href}>{linkContent}</div>;
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Quick Action */}
        {!collapsed && (
          <div className="p-3 border-t">
            <Button asChild className="w-full gradient-primary shadow-lg shadow-blue-500/20">
              <Link href="/dashboard/data/periods" onClick={handleLinkClick}>
                <Calendar size={18} />
                <span>{t.navItems.newPeriod || 'فترة جمع جديدة'}</span>
              </Link>
            </Button>
          </div>
        )}

        {/* User Section */}
        <div className="p-3 border-t">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user?.display_name?.charAt(0) || 'م'}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
                  <p>{user?.display_name || user?.username}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onLogout}>
                    <LogOut size={18} className="text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
                  <p>{t.auth.logout}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {user?.display_name?.charAt(0) || 'م'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {user?.display_name || user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild className="flex-1">
                  <Link href="/dashboard/settings" onClick={handleLinkClick}>
                    <Settings size={16} />
                    <span>{t.navItems.settings}</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { handleLinkClick(); onLogout(); }} className="flex-1 text-destructive hover:text-destructive">
                  <LogOut size={16} />
                  <span>{t.navItems.logout}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
