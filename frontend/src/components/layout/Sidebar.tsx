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
  CheckCircle,
  Sparkles,
  Download,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Layers,
  Calendar,
  FileUp,
  FileCheck,
  PenTool,
  Upload,
  FileEdit,
  X,
  Menu,
  Zap,
} from 'lucide-react';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  titleKey: string;
  icon: React.ElementType;
  color: string;
  items: NavItem[];
}

const navigationConfig: NavGroup[] = [
  {
    titleKey: 'templates',
    icon: FileText,
    color: 'blue',
    items: [
      { titleKey: 'templates', href: '/dashboard/templates', icon: FileText },
      { titleKey: 'structure', href: '/dashboard/templates/structure', icon: Layers },
      { titleKey: 'entities', href: '/dashboard/templates/entities', icon: Building2 },
    ],
  },
  {
    titleKey: 'dataCollection',
    icon: Calendar,
    color: 'emerald',
    items: [
      { titleKey: 'periods', href: '/dashboard/data/periods', icon: Calendar },
      { titleKey: 'submissions', href: '/dashboard/data/submissions', icon: FileUp },
      { titleKey: 'files', href: '/dashboard/data/files', icon: FileCheck },
      { titleKey: 'importData', href: '/dashboard/import', icon: Upload },
    ],
  },
  {
    titleKey: 'review',
    icon: CheckCircle,
    color: 'amber',
    items: [
      { titleKey: 'dataReview', href: '/dashboard/review/data', icon: FileCheck },
      { titleKey: 'contentReview', href: '/dashboard/review/content', icon: CheckCircle },
    ],
  },
  {
    titleKey: 'generation',
    icon: Sparkles,
    color: 'purple',
    items: [
      { titleKey: 'aiGeneration', href: '/dashboard/generate', icon: Sparkles },
      { titleKey: 'drafts', href: '/dashboard/drafts', icon: PenTool },
      { titleKey: 'manualContent', href: '/dashboard/content/manual', icon: FileEdit },
      { titleKey: 'exportReport', href: '/dashboard/export', icon: Download },
    ],
  },
];

const colorStyles: Record<string, { bg: string; text: string; hover: string; active: string; icon: string }> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
    active: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30',
    icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
    active: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30',
    icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    hover: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
    active: 'bg-amber-600 text-white shadow-lg shadow-amber-500/30',
    icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-600 dark:text-purple-400',
    hover: 'hover:bg-purple-50 dark:hover:bg-purple-950/30',
    active: 'bg-purple-600 text-white shadow-lg shadow-purple-500/30',
    icon: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
  },
};

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

  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };

  const toggleGroup = (titleKey: string) => {
    setExpandedGroups((prev) =>
      prev.includes(titleKey) ? prev.filter((k) => k !== titleKey) : [...prev, titleKey]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href) || false;
  };

  const getNavTitle = (key: string): string => {
    const navTitles: Record<string, string> = {
      templates: t.nav.templates || 'القوالب',
      dataCollection: t.nav.dataCollection || 'جمع البيانات',
      review: t.nav.review || 'المراجعة',
      generation: t.nav.generation || 'التوليد والتصدير',
    };
    return navTitles[key] || key;
  };

  const getItemTitle = (key: string): string => {
    return (t.navItems as Record<string, string>)[key] || key;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'h-screen flex flex-col border-e border-gray-200 dark:border-gray-800',
          isMobile 
            ? 'relative w-[280px] max-w-[85vw] bg-white dark:bg-gray-950 shadow-2xl' 
            : cn(
                'fixed top-0 z-40 transition-all duration-300 bg-white dark:bg-gray-950',
                dir === 'rtl' ? 'right-0' : 'left-0',
                collapsed ? 'w-[72px]' : 'w-[260px]'
              )
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={handleLinkClick}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25">
              <Zap className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white">{t.app.name}</h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t.app.tagline}</p>
              </div>
            )}
          </Link>
          {isMobile ? (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          ) : (
            <button onClick={() => onCollapse(!collapsed)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Dashboard Link */}
        <div className="px-3 pt-4 pb-2">
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
              dir === 'rtl' && 'flex-row-reverse',
              isActive('/dashboard') && pathname === '/dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              isActive('/dashboard') && pathname === '/dashboard'
                ? 'bg-white/20'
                : 'bg-gray-100 dark:bg-gray-800'
            )}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            {!collapsed && <span className="font-medium">لوحة التحكم</span>}
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-4 py-2">
            {navigationConfig.map((group) => {
              const GroupIcon = group.icon;
              const colors = colorStyles[group.color];
              const isExpanded = expandedGroups.includes(group.titleKey);
              const hasActiveItem = group.items.some(item => isActive(item.href));

              return (
                <div key={group.titleKey}>
                  {/* Group Header */}
                  {!collapsed ? (
                    <button
                      onClick={() => toggleGroup(group.titleKey)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                        dir === 'rtl' && 'flex-row-reverse',
                        hasActiveItem ? colors.bg : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors.icon)}>
                        <GroupIcon className="w-5 h-5" />
                      </div>
                      <span className={cn('flex-1 font-semibold text-sm', dir === 'rtl' ? 'text-right' : 'text-left', hasActiveItem ? colors.text : 'text-gray-700 dark:text-gray-300')}>
                        {getNavTitle(group.titleKey)}
                      </span>
                      <ChevronDown className={cn(
                        'w-4 h-4 text-gray-400 transition-transform',
                        isExpanded && 'rotate-180'
                      )} />
                    </button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn('w-full flex justify-center py-2')}>
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.icon)}>
                            <GroupIcon className="w-5 h-5" />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
                        <p>{getNavTitle(group.titleKey)}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Group Items */}
                  {!collapsed && isExpanded && (
                    <div className={cn(
                      'mt-1 space-y-1',
                      dir === 'rtl' ? 'mr-6 border-r-2 pr-3' : 'ml-6 border-l-2 pl-3',
                      'border-gray-100 dark:border-gray-800'
                    )}>
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleLinkClick}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                              dir === 'rtl' && 'flex-row-reverse',
                              active
                                ? colors.active
                                : cn('text-gray-600 dark:text-gray-400', colors.hover)
                            )}
                          >
                            <ItemIcon className="w-4 h-4" />
                            <span className="font-medium">{getItemTitle(item.titleKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Collapsed Items */}
                  {collapsed && (
                    <div className="space-y-1 mt-1">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isActive(item.href);

                        return (
                          <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                              <Link
                                href={item.href}
                                onClick={handleLinkClick}
                                className={cn(
                                  'flex justify-center py-2',
                                )}
                              >
                                <div className={cn(
                                  'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                                  active ? colors.active : cn('text-gray-500 dark:text-gray-400', colors.hover)
                                )}>
                                  <ItemIcon className="w-4 h-4" />
                                </div>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
                              <p>{getItemTitle(item.titleKey)}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold cursor-pointer">
                    {user?.display_name?.charAt(0) || 'م'}
                  </div>
                </TooltipTrigger>
                <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
                  <p>{user?.display_name || user?.username}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onLogout} className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
                  <p>{t.auth.logout}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-3">
              {/* User Card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                  {user?.display_name?.charAt(0) || 'م'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {user?.display_name || user?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href="/dashboard/settings"
                  onClick={handleLinkClick}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>الإعدادات</span>
                </Link>
                <button
                  onClick={() => { handleLinkClick(); onLogout(); }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>خروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
