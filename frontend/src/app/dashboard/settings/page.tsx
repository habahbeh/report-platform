'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageTransition, FadeIn } from '@/components/ui/motion';
import { Settings, User, Lock, Palette, Bot, Bell, Save, Check, Loader2, Sun, Moon, Monitor } from 'lucide-react';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  name_ar: string;
  display_name: string;
  organization_name: string | null;
}

type Theme = 'light' | 'dark' | 'system';

const tabs = [
  { id: 'profile', icon: User },
  { id: 'password', icon: Lock },
  { id: 'appearance', icon: Palette },
  { id: 'ai', icon: Bot },
  { id: 'notifications', icon: Bell },
];

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'appearance' | 'ai' | 'notifications'>('profile');
  const [theme, setThemeState] = useState<Theme>('light');
  const [profileForm, setProfileForm] = useState({ name_ar: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [aiSettings, setAiSettings] = useState({ default_model: 'cli', word_count: 500, include_charts: true, include_tables: true });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  function applyTheme(newTheme: Theme) {
    const root = document.documentElement;
    if (newTheme === 'dark') root.classList.add('dark');
    else if (newTheme === 'light') root.classList.remove('dark');
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
    else root.classList.remove('dark');
  }

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    try {
      const data = await api.auth.me();
      setUser(data);
      setProfileForm({ name_ar: data.name_ar || '', email: data.email || '' });
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
      await api.auth.changePassword({ old_password: passwordForm.old_password, new_password: passwordForm.new_password, new_password_confirm: passwordForm.confirm_password });
      alert('تم تغيير كلمة المرور بنجاح');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      alert('فشل في تغيير كلمة المرور');
    } finally {
      setSaving(false);
    }
  }

  const getTabLabel = (id: string) => {
    const labels: Record<string, Record<string, string>> = {
      profile: { ar: 'الملف الشخصي', en: 'Profile' },
      password: { ar: 'كلمة المرور', en: 'Password' },
      appearance: { ar: 'المظهر واللغة', en: 'Appearance' },
      ai: { ar: 'إعدادات AI', en: 'AI Settings' },
      notifications: { ar: 'الإشعارات', en: 'Notifications' },
    };
    return labels[id]?.[language] || id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Settings className="w-7 h-7 text-blue-600" />
              <span>{language === 'ar' ? 'الإعدادات' : 'Settings'}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {language === 'ar' ? 'إدارة حسابك وتفضيلات النظام' : 'Manage your account and system preferences'}
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <FadeIn delay={0.1} className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/50 dark:text-blue-400'
                          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{getTabLabel(tab.id)}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </FadeIn>

          <FadeIn delay={0.2} className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
                  </h2>
                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{language === 'ar' ? 'اسم المستخدم' : 'Username'}</label>
                      <input type="text" value={user?.username || ''} disabled className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{language === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'}</label>
                      <input type="text" value={profileForm.name_ar} onChange={(e) => setProfileForm({ ...profileForm, name_ar: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                      <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
                    </div>
                    <button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    <span>{language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
                  </h2>
                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                      <input type="password" value={passwordForm.old_password} onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                      <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                      <input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
                    </div>
                    <button onClick={handleChangePassword} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-blue-600" />
                    <span>{language === 'ar' ? 'المظهر واللغة' : 'Appearance & Language'}</span>
                  </h2>
                  <div className="space-y-8 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{language === 'ar' ? 'اللغة' : 'Language'}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ id: 'ar', label: 'العربية', desc: 'Arabic' }, { id: 'en', label: 'English', desc: 'الإنجليزية' }].map((lang) => (
                          <button key={lang.id} onClick={() => setLanguage(lang.id as 'ar' | 'en')} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${language === lang.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                            <div className="text-start flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">{lang.label}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{lang.desc}</div>
                            </div>
                            {language === lang.id && <Check className="w-5 h-5 text-blue-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{language === 'ar' ? 'المظهر' : 'Theme'}</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[{ id: 'light', label: language === 'ar' ? 'فاتح' : 'Light', icon: Sun }, { id: 'dark', label: language === 'ar' ? 'داكن' : 'Dark', icon: Moon }, { id: 'system', label: language === 'ar' ? 'النظام' : 'System', icon: Monitor }].map((themeOption) => {
                          const Icon = themeOption.icon;
                          return (
                            <button key={themeOption.id} onClick={() => setTheme(themeOption.id as Theme)} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === themeOption.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                              <Icon className="w-6 h-6" />
                              <span className="font-medium text-gray-900 dark:text-white">{themeOption.label}</span>
                              {theme === themeOption.id && <Check className="w-4 h-4 text-blue-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <span>{language === 'ar' ? 'إعدادات الذكاء الاصطناعي' : 'AI Settings'}</span>
                  </h2>
                  <div className="space-y-6 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{language === 'ar' ? 'النموذج الافتراضي' : 'Default Model'}</label>
                      <div className="space-y-2">
                        {[{ id: 'cli', label: 'Claude CLI', desc: language === 'ar' ? 'الأسرع والأكثر دقة' : 'Fastest & Most Accurate' }, { id: 'claude', label: 'Claude API', desc: language === 'ar' ? 'عبر واجهة برمجية' : 'Via API' }, { id: 'gemini', label: 'Gemini', desc: language === 'ar' ? 'من Google' : 'By Google' }].map((model) => (
                          <label key={model.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${aiSettings.default_model === model.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                            <input type="radio" name="model" value={model.id} checked={aiSettings.default_model === model.id} onChange={(e) => setAiSettings({ ...aiSettings, default_model: e.target.value })} className="w-5 h-5 accent-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{model.label}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{model.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                      <Save className="w-4 h-4" />
                      {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <span>{language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}</span>
                  </h2>
                  <div className="space-y-4 max-w-lg">
                    {[
                      { id: 'email_submissions', label: language === 'ar' ? 'إشعارات التسليمات' : 'Submission Notifications', desc: language === 'ar' ? 'عند تسليم جهة لبياناتها' : 'When an entity submits data' },
                      { id: 'email_reviews', label: language === 'ar' ? 'إشعارات المراجعة' : 'Review Notifications', desc: language === 'ar' ? 'عند اعتماد أو رفض محتوى' : 'When content is approved or rejected' },
                      { id: 'email_generation', label: language === 'ar' ? 'إشعارات التوليد' : 'Generation Notifications', desc: language === 'ar' ? 'عند اكتمال توليد المحتوى' : 'When content generation completes' },
                    ].map((item) => (
                      <label key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</div>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-600" />
                      </label>
                    ))}
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                      <Save className="w-4 h-4" />
                      {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
