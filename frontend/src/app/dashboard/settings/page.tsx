'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  name_ar: string;
  display_name: string;
  organization_name: string | null;
}

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'appearance' | 'ai' | 'notifications'>('profile');
  const [theme, setThemeState] = useState<Theme>('light');

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  function applyTheme(newTheme: Theme) {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name_ar: '',
    email: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  // AI Settings state
  const [aiSettings, setAiSettings] = useState({
    default_model: 'cli',
    word_count: 500,
    include_charts: true,
    include_tables: true,
  });

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const data = await api.auth.me();
      setUser(data);
      setProfileForm({
        name_ar: data.name_ar || '',
        email: data.email || '',
      });
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await api.auth.updateProfile(profileForm);
      alert('تم حفظ التغييرات بنجاح');
      loadUser();
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('فشل في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    setSaving(true);
    try {
      await api.auth.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
        new_password_confirm: passwordForm.confirm_password,
      });
      alert('تم تغيير كلمة المرور بنجاح');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('فشل في تغيير كلمة المرور');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>⚙️</span>
          <span>{language === 'ar' ? 'الإعدادات' : 'Settings'}</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {language === 'ar' ? 'إدارة حسابك وتفضيلات النظام' : 'Manage your account and system preferences'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="card lg:col-span-1">
          <nav className="space-y-1">
            {[
              { id: 'profile', label: language === 'ar' ? 'الملف الشخصي' : 'Profile', icon: '👤' },
              { id: 'password', label: language === 'ar' ? 'كلمة المرور' : 'Password', icon: '🔐' },
              { id: 'appearance', label: language === 'ar' ? 'المظهر واللغة' : 'Appearance', icon: '🎨' },
              { id: 'ai', label: language === 'ar' ? 'إعدادات AI' : 'AI Settings', icon: '🤖' },
              { id: 'notifications', label: language === 'ar' ? 'الإشعارات' : 'Notifications', icon: '🔔' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/50 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 card">
          {activeTab === 'profile' && (
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span>👤</span>
                <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
              </h2>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'اسم المستخدم' : 'Username'}
                  </label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="input bg-gray-50 dark:bg-gray-600 w-full"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'ar' ? 'لا يمكن تغيير اسم المستخدم' : 'Username cannot be changed'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'}
                  </label>
                  <input
                    type="text"
                    value={profileForm.name_ar}
                    onChange={(e) => setProfileForm({ ...profileForm, name_ar: e.target.value })}
                    className="input w-full"
                    placeholder={language === 'ar' ? 'أدخل اسمك بالعربي' : 'Enter your Arabic name'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="input w-full"
                    placeholder="example@email.com"
                  />
                </div>

                {user?.organization_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'ar' ? 'المؤسسة' : 'Organization'}
                    </label>
                    <input
                      type="text"
                      value={user.organization_name}
                      disabled
                      className="input bg-gray-50 dark:bg-gray-600 w-full"
                    />
                  </div>
                )}

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : (language === 'ar' ? '💾 حفظ التغييرات' : '💾 Save Changes')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span>🔐</span>
                <span>{language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
              </h2>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving
                    ? (language === 'ar' ? 'جاري التغيير...' : 'Changing...')
                    : (language === 'ar' ? '🔐 تغيير كلمة المرور' : '🔐 Change Password')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span>🎨</span>
                <span>{language === 'ar' ? 'المظهر واللغة' : 'Appearance & Language'}</span>
              </h2>

              <div className="space-y-8 max-w-lg">
                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {language === 'ar' ? 'اللغة' : 'Language'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'ar', label: 'العربية', flag: '🇸🇦', desc: 'Arabic' },
                      { id: 'en', label: 'English', flag: '🇺🇸', desc: 'الإنجليزية' },
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setLanguage(lang.id as 'ar' | 'en')}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          language === lang.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <div className="text-start">
                          <div className="font-medium text-gray-900 dark:text-white">{lang.label}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{lang.desc}</div>
                        </div>
                        {language === lang.id && (
                          <span className="ms-auto text-blue-500">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {language === 'ar' ? 'المظهر' : 'Theme'}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: language === 'ar' ? 'فاتح' : 'Light', icon: '☀️' },
                      { id: 'dark', label: language === 'ar' ? 'داكن' : 'Dark', icon: '🌙' },
                      { id: 'system', label: language === 'ar' ? 'النظام' : 'System', icon: '💻' },
                    ].map((themeOption) => (
                      <button
                        key={themeOption.id}
                        onClick={() => setTheme(themeOption.id as Theme)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === themeOption.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className="text-2xl">{themeOption.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{themeOption.label}</span>
                        {theme === themeOption.id && (
                          <span className="text-blue-500 text-sm">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {language === 'ar'
                      ? 'يتم حفظ تفضيلاتك تلقائياً وستظهر عند تسجيل الدخول مرة أخرى.'
                      : 'Your preferences are saved automatically and will appear when you log in again.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span>🤖</span>
                <span>{language === 'ar' ? 'إعدادات الذكاء الاصطناعي' : 'AI Settings'}</span>
              </h2>

              <div className="space-y-6 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'النموذج الافتراضي' : 'Default Model'}
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'cli', label: 'Claude CLI', desc: language === 'ar' ? 'الأسرع والأكثر دقة' : 'Fastest & Most Accurate' },
                      { id: 'claude', label: 'Claude API', desc: language === 'ar' ? 'عبر واجهة برمجية' : 'Via API' },
                      { id: 'gemini', label: 'Gemini', desc: language === 'ar' ? 'من Google' : 'By Google' },
                    ].map((model) => (
                      <label
                        key={model.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          aiSettings.default_model === model.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="model"
                          value={model.id}
                          checked={aiSettings.default_model === model.id}
                          onChange={(e) => setAiSettings({ ...aiSettings, default_model: e.target.value })}
                          className="w-5 h-5"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{model.label}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{model.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'عدد الكلمات الافتراضي' : 'Default Word Count'}
                  </label>
                  <input
                    type="number"
                    value={aiSettings.word_count}
                    onChange={(e) => setAiSettings({ ...aiSettings, word_count: parseInt(e.target.value) })}
                    className="input w-full"
                    min="100"
                    max="2000"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <input
                      type="checkbox"
                      checked={aiSettings.include_charts}
                      onChange={(e) => setAiSettings({ ...aiSettings, include_charts: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span>{language === 'ar' ? 'تضمين الرسوم البيانية تلقائياً' : 'Include charts automatically'}</span>
                  </label>
                  <label className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <input
                      type="checkbox"
                      checked={aiSettings.include_tables}
                      onChange={(e) => setAiSettings({ ...aiSettings, include_tables: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span>{language === 'ar' ? 'تضمين الجداول تلقائياً' : 'Include tables automatically'}</span>
                  </label>
                </div>

                <button className="btn btn-primary">
                  {language === 'ar' ? '💾 حفظ الإعدادات' : '💾 Save Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span>🔔</span>
                <span>{language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}</span>
              </h2>

              <div className="space-y-4 max-w-lg">
                {[
                  { id: 'email_submissions', label: language === 'ar' ? 'إشعارات التسليمات' : 'Submission Notifications', desc: language === 'ar' ? 'عند تسليم جهة لبياناتها' : 'When an entity submits data' },
                  { id: 'email_reviews', label: language === 'ar' ? 'إشعارات المراجعة' : 'Review Notifications', desc: language === 'ar' ? 'عند اعتماد أو رفض محتوى' : 'When content is approved or rejected' },
                  { id: 'email_generation', label: language === 'ar' ? 'إشعارات التوليد' : 'Generation Notifications', desc: language === 'ar' ? 'عند اكتمال توليد المحتوى' : 'When content generation completes' },
                  { id: 'email_exports', label: language === 'ar' ? 'إشعارات التصدير' : 'Export Notifications', desc: language === 'ar' ? 'عند اكتمال تصدير التقرير' : 'When report export completes' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500 cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded"
                    />
                  </label>
                ))}

                <button className="btn btn-primary">
                  {language === 'ar' ? '💾 حفظ الإعدادات' : '💾 Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
