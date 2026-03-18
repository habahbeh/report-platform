'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  FolderKanban,
  Database,
  FileText,
  Settings,
  LogOut,
  X,
  Menu,
  Zap,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
  matchPrefix?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'الرئيسية',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: 'blue',
  },
  {
    label: 'المشاريع',
    href: '/dashboard/projects',
    icon: FolderKanban,
    color: 'indigo',
    matchPrefix: true,
  },
  {
    label: 'البيانات',
    href: '/dashboard/data',
    icon: Database,
    color: 'emerald',
    matchPrefix: true,
  },
  {
    label: 'التقارير',
    href: '/dashboard/generate',
    icon: FileText,
    color: 'purple',
    matchPrefix: true,
  },
  {
    label: 'الإعدادات',
    href: '/dashboard/settings',
    icon: Settings,
    color: 'gray',
  },
];

const colorMap: Record<string, { active: string; icon: string; hover: string }> = {
  blue: {
    active: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25',
    icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
  },
  indigo: {
    active: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25',
    icon: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400',
    hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
  },
  emerald: {
    active: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25',
    icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
  },
  purple: {
    active: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/25',
    icon: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    hover: 'hover:bg-purple-50 dark:hover:bg-purple-950/30',
  },
  gray: {
    active: 'bg-gradient-to-r from-gray-600 to-slate-600 text-white shadow-lg shadow-gray-500/25',
    icon: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
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

  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) {
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
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

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-2 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              const colors = colorMap[item.color];

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        onClick={handleLinkClick}
                        className="flex justify-center py-2"
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                            active ? colors.active : cn('text-gray-500 dark:text-gray-400', colors.hover)
                          )}
                        >
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
                    'flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
                    dir === 'rtl' && 'flex-row-reverse',
                    active
                      ? colors.active
                      : cn('text-gray-600 dark:text-gray-400', colors.hover)
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      active ? 'bg-white/20' : colors.icon
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">{item.label}</span>
                </Link>
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

              {/* Logout */}
              <button
                onClick={() => { handleLinkClick(); onLogout(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
