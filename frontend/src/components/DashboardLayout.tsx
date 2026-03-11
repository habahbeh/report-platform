'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api, getAuthToken, setAuthToken } from '@/lib/api';

// ==========================================
// Types
// ==========================================
interface User {
  id: number;
  username: string;
  email: string;
  name_ar?: string;
  display_name: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: number | string;
  children?: NavItem[];
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ==========================================
// Context for sharing state
// ==========================================
interface DashboardContextType {
  user: User | null;
  currentProject: any;
  setCurrentProject: (project: any) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  currentProject: null,
  setCurrentProject: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
});

export const useDashboard = () => useContext(DashboardContext);

// ==========================================
// Navigation Structure - Based on Workflow
// ==========================================
const navigationGroups: NavGroup[] = [
  {
    title: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم', href: '/dashboard', icon: '🏠' },
    ],
  },
  {
    title: 'إدارة القوالب',
    items: [
      { name: 'القوالب', href: '/dashboard/templates', icon: '📋' },
      { name: 'المحاور والبنود', href: '/dashboard/templates/structure', icon: '🏗️' },
      { name: 'الجهات', href: '/dashboard/templates/entities', icon: '🏢' },
    ],
  },
  {
    title: 'المشاريع',
    items: [
      { name: 'كل المشاريع', href: '/dashboard/projects', icon: '📁' },
      { name: 'مشروع جديد', href: '/dashboard/projects/new', icon: '➕' },
    ],
  },
  {
    title: 'جمع البيانات',
    items: [
      { name: 'فترات الجمع', href: '/dashboard/data/periods', icon: '📅' },
      { name: 'تسليمات الجهات', href: '/dashboard/data/submissions', icon: '📥' },
      { name: 'الملفات المرفوعة', href: '/dashboard/data/files', icon: '📎' },
      { name: 'استيراد Excel', href: '/dashboard/import', icon: '📊' },
    ],
  },
  {
    title: 'المراجعة والاعتماد',
    items: [
      { name: 'مراجعة البيانات', href: '/dashboard/review/data', icon: '👁️' },
      { name: 'مراجعة المحتوى', href: '/dashboard/review/content', icon: '✅' },
    ],
  },
  {
    title: 'توليد المحتوى',
    items: [
      { name: 'توليد AI', href: '/dashboard/generate', icon: '🤖' },
      { name: 'المسودات', href: '/dashboard/drafts', icon: '📝' },
      { name: 'محتوى يدوي', href: '/dashboard/content/manual', icon: '✍️' },
    ],
  },
  {
    title: 'التصدير',
    items: [
      { name: 'تصدير التقرير', href: '/dashboard/export', icon: '📄' },
      { name: 'التقارير المولّدة', href: '/dashboard/reports', icon: '📚' },
    ],
  },
];

// ==========================================
// Breadcrumb mapping
// ==========================================
const getBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const crumbs: BreadcrumbItem[] = [{ label: 'الرئيسية', href: '/dashboard' }];

  const pathMap: Record<string, string> = {
    '/dashboard/templates': 'القوالب',
    '/dashboard/templates/structure': 'المحاور والبنود',
    '/dashboard/templates/entities': 'الجهات',
    '/dashboard/projects': 'المشاريع',
    '/dashboard/projects/new': 'مشروع جديد',
    '/dashboard/data': 'البيانات',
    '/dashboard/data/periods': 'فترات الجمع',
    '/dashboard/data/submissions': 'تسليمات الجهات',
    '/dashboard/data/files': 'الملفات',
    '/dashboard/import': 'استيراد Excel',
    '/dashboard/review': 'المراجعة',
    '/dashboard/review/data': 'مراجعة البيانات',
    '/dashboard/review/content': 'مراجعة المحتوى',
    '/dashboard/generate': 'توليد AI',
    '/dashboard/drafts': 'المسودات',
    '/dashboard/content/manual': 'محتوى يدوي',
    '/dashboard/export': 'تصدير التقرير',
    '/dashboard/reports': 'التقارير',
    '/dashboard/ai': 'توليد AI',
    '/dashboard/settings': 'الإعدادات',
  };

  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';

  for (let i = 1; i < segments.length; i++) {
    currentPath += '/' + segments.slice(0, i + 1).join('/');
    const label = pathMap[currentPath];
    if (label) {
      crumbs.push({
        label,
        href: i < segments.length - 1 ? currentPath : undefined,
      });
    }
  }

  return crumbs;
};

// ==========================================
// Sidebar Component
// ==========================================
function Sidebar({
  collapsed,
  onToggle,
  user,
  onLogout
}: {
  collapsed: boolean;
  onToggle: () => void;
  user: User | null;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    navigationGroups.map(g => g.title)
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 z-50 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          {!collapsed && (
            <div>
              <span className="font-bold text-gray-900">تقرير.ai</span>
              <span className="block text-xs text-gray-500">منصة التقارير</span>
            </div>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
              >
                {group.title}
                <span className="text-lg">
                  {expandedGroups.includes(group.title) ? '−' : '+'}
                </span>
              </button>
            )}

            {(collapsed || expandedGroups.includes(group.title)) && (
              <div className="space-y-1 mt-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.name : undefined}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.name}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-100">
          <Link
            href="/dashboard/projects/new"
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <span>➕</span>
            <span>مشروع جديد</span>
          </Link>
        </div>
      )}

      {/* User Section */}
      <div className="p-3 border-t border-gray-100">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
              {user?.display_name?.charAt(0) || 'م'}
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-500"
              title="تسجيل الخروج"
            >
              🚪
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                {user?.display_name?.charAt(0) || 'م'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">
                  {user?.display_name || user?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard/settings"
                className="flex-1 py-2 text-center text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ⚙️ الإعدادات
              </Link>
              <button
                onClick={onLogout}
                className="flex-1 py-2 text-center text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                🚪 خروج
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

// ==========================================
// Breadcrumb Component
// ==========================================
function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-gray-300">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-blue-600 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

// ==========================================
// Workflow Progress Component
// ==========================================
function WorkflowProgress() {
  const pathname = usePathname();

  const steps = [
    { id: 'template', label: 'القالب', icon: '📋', paths: ['/dashboard/templates'] },
    { id: 'project', label: 'المشروع', icon: '📁', paths: ['/dashboard/projects'] },
    { id: 'collect', label: 'جمع البيانات', icon: '📥', paths: ['/dashboard/data'] },
    { id: 'review', label: 'المراجعة', icon: '👁️', paths: ['/dashboard/review'] },
    { id: 'generate', label: 'التوليد', icon: '🤖', paths: ['/dashboard/generate', '/dashboard/drafts'] },
    { id: 'export', label: 'التصدير', icon: '📄', paths: ['/dashboard/export', '/dashboard/reports'] },
  ];

  const currentStepIndex = steps.findIndex(step =>
    step.paths.some(p => pathname.startsWith(p))
  );

  return (
    <div className="hidden lg:flex items-center gap-1 bg-white rounded-xl p-2 shadow-sm border border-gray-100">
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isPast = index < currentStepIndex;

        return (
          <div key={step.id} className="flex items-center">
            <Link
              href={step.paths[0]}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm ${
                isActive
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : isPast
                  ? 'text-green-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>{isPast ? '✓' : step.icon}</span>
              <span className="hidden xl:inline">{step.label}</span>
            </Link>
            {index < steps.length - 1 && (
              <span className={`mx-1 ${isPast ? 'text-green-400' : 'text-gray-300'}`}>
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// Main Layout Component
// ==========================================
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const breadcrumbs = getBreadcrumbs(pathname);

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
      // Ignore errors
    }
    setAuthToken(null);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider
      value={{
        user,
        currentProject,
        setCurrentProject,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Desktop */}
        <div className="hidden lg:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            user={user}
            onLogout={handleLogout}
          />
        </div>

        {/* Sidebar - Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
              user={user}
              onLogout={handleLogout}
            />
          </div>
        )}

        {/* Main Content */}
        <div
          className={`transition-all duration-300 ${
            sidebarCollapsed ? 'lg:pr-20' : 'lg:pr-72'
          }`}
        >
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 lg:px-6">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Breadcrumbs */}
              <div className="hidden md:block">
                <Breadcrumbs items={breadcrumbs} />
              </div>

              {/* Workflow Progress */}
              <WorkflowProgress />

              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/projects/new"
                  className="hidden sm:flex btn btn-primary text-sm"
                >
                  + مشروع جديد
                </Link>

                {/* Notifications */}
                <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                  🔔
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Help */}
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                  ❓
                </button>
              </div>
            </div>

            {/* Mobile Breadcrumbs */}
            <div className="md:hidden px-4 pb-3">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 lg:p-6 animate-fade-in">
            {children}
          </main>

          {/* Footer */}
          <footer className="px-4 lg:px-6 py-4 text-center text-sm text-gray-400 border-t border-gray-100">
            تقرير.ai © 2024 - منصة توليد التقارير المؤسسية بالذكاء الاصطناعي
          </footer>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
