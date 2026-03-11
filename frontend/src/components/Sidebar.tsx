'use client';

import {
  HomeIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

type Tab = 'dashboard' | 'templates' | 'reports';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const navigation = [
  { name: 'لوحة التحكم', id: 'dashboard' as Tab, icon: HomeIcon },
  { name: 'القوالب', id: 'templates' as Tab, icon: DocumentDuplicateIcon },
  { name: 'التقارير', id: 'reports' as Tab, icon: DocumentTextIcon },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">📊 منصة التقارير</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium
                ${isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <item.icon
                className={`ml-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}
              />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-gray-800 p-4">
        <button className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
          <Cog6ToothIcon className="ml-3 h-5 w-5 text-gray-400" />
          الإعدادات
        </button>
      </div>
    </div>
  );
}
