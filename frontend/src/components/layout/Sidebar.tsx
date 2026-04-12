'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useTranslation } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import {
  LayoutDashboard, FolderKanban, LayoutTemplate, Settings, LogOut,
  X, Menu, Zap, Users, FileCode2, Sparkles, Download, Layers,
  ChevronLeft, Briefcase, AlertCircle,
} from 'lucide-react';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
  matchPrefix?: boolean;
}

interface ActiveProject {
  id: string;
  name: string;
  status: string;
  contributors_count: number;
  items_progress: number;
  progress: number;
  days_remaining: number | null;
}

// Main navigation (always visible)
const mainNavItems: NavItem[] = [
  { label: 'الرئيسية',  href: '/dashboard',          icon: LayoutDashboard, color: 'blue' },
  { label: 'المشاريع',  href: '/dashboard/projects', icon: FolderKanban,    color: 'indigo', matchPrefix: true },
];

// Secondary navigation (bottom)
const secondaryNavItems: NavItem[] = [
  { label: 'القوالب',   href: '/dashboard/templates', icon: LayoutTemplate, color: 'purple', matchPrefix: true },
  { label: 'الإعدادات', href: '/dashboard/settings',  icon: Settings,       color: 'gray' },
];

// Project context sub-navigation
const projectSubNav = (projectId: string) => [
  { label: 'نظرة عامة',   href: `/dashboard/projects/${projectId}`,           icon: Briefcase,   key: 'overview' },
  { label: 'هيكل التقرير', href: `/dashboard/projects/${projectId}/structure`, icon: Layers,      key: 'structure' },
];

const colorMap: Record<string, { active: string; icon: string; hover: string }> = {
  blue:    { active: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25',    icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',       hover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30' },
  indigo:  { active: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25', icon: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400', hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30' },
  emerald: { active: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25', icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400', hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30' },
  purple:  { active: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/25', icon: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400', hover: 'hover:bg-purple-50 dark:hover:bg-purple-950/30' },
  gray:    { active: 'bg-gradient-to-r from-gray-600 to-slate-600 text-white shadow-lg shadow-gray-500/25',      icon: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',           hover: 'hover:bg-gray-50 dark:hover:bg-gray-800/50' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft:      { label: 'مسودة',         color: 'text-gray-500' },
  collecting: { label: 'جمع البيانات',  color: 'text-amber-600' },
  reviewing:  { label: 'مراجعة',        color: 'text-blue-600' },
  generating: { label: 'توليد النصوص',  color: 'text-purple-600' },
  published:  { label: 'منشور',         color: 'text-emerald-600' },
  archived:   { label: 'مؤرشف',         color: 'text-gray-500' },
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
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);

  // Detect if we're inside a project
  const projectIdMatch = pathname.match(/\/dashboard\/projects\/([a-f0-9-]{36})/);
  const activeProjectId = projectIdMatch ? projectIdMatch[1] : null;

  // Load project data when inside a project
  useEffect(() => {
    if (!activeProjectId) {
      setActiveProject(null);
      return;
    }
    let cancelled = false;
    api.projects.get(activeProjectId)
      .then(data => { if (!cancelled) setActiveProject(data); })
      .catch(() => { if (!cancelled) setActiveProject(null); });
    return () => { cancelled = true; };
  }, [activeProjectId]);

  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };

  const isActive = (item: NavItem) => {
    // If we're inside a specific project, don't highlight "المشاريع"
    // The Active Project card handles that context
    if (activeProjectId && item.href === '/dashboard/projects') return false;
    if (item.matchPrefix) return pathname.startsWith(item.href);
    return pathname === item.href;
  };

  // Calculate alerts for active project
  const alerts: { type: string; count: number; href: string }[] = [];
  if (activeProject) {
    // Pending contributors alert (those who haven't submitted yet and deadline is close)
    if (activeProject.progress < 100 && activeProject.status === 'collecting') {
      const pending = Math.round((100 - activeProject.progress) / 100 * activeProject.contributors_count);
      if (pending > 0) {
        alerts.push({ type: 'contributors', count: pending, href: `/dashboard/projects/${activeProjectId}` });
      }
    }
  }

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item);
    const colors = colorMap[item.color];

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link href={item.href} onClick={handleLinkClick} className="flex justify-center py-2">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                active ? colors.active : cn('text-gray-500 dark:text-gray-400', colors.hover)
              )}>
                <Icon className="w-5 h-5" />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleLinkClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
          dir === 'rtl' && 'flex-row-reverse',
          active ? colors.active : cn('text-gray-600 dark:text-gray-400', colors.hover)
        )}
      >
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', active ? 'bg-white/20' : colors.icon)}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm">{item.label}</span>
      </Link>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'h-screen flex flex-col border-e border-gray-200 dark:border-gray-800 overflow-hidden',
          isMobile
            ? 'relative w-[280px] max-w-[85vw] bg-white dark:bg-gray-950 shadow-2xl'
            : cn(
                'fixed top-0 z-40 transition-all duration-300 bg-white dark:bg-gray-950',
                dir === 'rtl' ? 'right-0' : 'left-0',
                collapsed ? 'w-[72px]' : 'w-[280px]'
              )
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
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

        {/* Scrollable Navigation */}
        <ScrollArea className="flex-1 px-3">
          {/* Main Nav */}
          <nav className="space-y-1 py-3">
            {mainNavItems.map(renderNavItem)}
          </nav>

          {/* Active Project Context */}
          {activeProject && !collapsed && (
            <div className="my-3">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent dark:from-blue-800" />
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">المشروع النشط</span>
                <div className="h-px flex-1 bg-gradient-to-l from-blue-200 to-transparent dark:from-blue-800" />
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30 overflow-hidden">
                {/* Project name */}
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-900 dark:text-white truncate" title={activeProject.name}>
                      {activeProject.name}
                    </div>
                    <div className={cn('text-[10px] font-medium', statusLabels[activeProject.status]?.color || 'text-gray-500')}>
                      {statusLabels[activeProject.status]?.label || activeProject.status}
                    </div>
                  </div>
                </div>

                {/* Mini progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-gray-500">التقدم</span>
                    <span className="font-bold text-blue-600">{activeProject.items_progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${activeProject.items_progress}%` }} />
                  </div>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {alerts.map((alert, i) => (
                      <Link
                        key={i}
                        href={alert.href}
                        className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-950/50 transition-colors"
                      >
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{alert.count} مساهم متأخر</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Project shortcuts */}
                <div className="space-y-1">
                  {projectSubNav(activeProject.id).map(subItem => {
                    const SubIcon = subItem.icon;
                    const isSubActive = pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.key}
                        href={subItem.href}
                        onClick={handleLinkClick}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors',
                          isSubActive
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                        )}
                      >
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{subItem.label}</span>
                        {isSubActive && <ChevronLeft className="w-3 h-3 mr-auto" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Secondary Nav */}
          <nav className="space-y-1 py-3 border-t border-gray-100 dark:border-gray-800 mt-2">
            {!collapsed && (
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
                أدوات إضافية
              </div>
            )}
            {secondaryNavItems.map(renderNavItem)}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
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
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                  {user?.display_name?.charAt(0) || 'م'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                    {user?.display_name || user?.username}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => { handleLinkClick(); onLogout(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
