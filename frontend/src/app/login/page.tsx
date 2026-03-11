'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register form
  const [email, setEmail] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await api.auth.login(username, password);
      setAuthToken(data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'فشل في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (password !== passwordConfirm) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }
    
    try {
      const data = await api.auth.register({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
        name_ar: nameAr,
      });
      setAuthToken(data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'فشل في إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold mb-4">
            📊
          </div>
          <h1 className="text-2xl font-bold text-gray-900">منصة توليد التقارير</h1>
          <p className="text-gray-600 mt-1">تقارير مؤسسية ذكية بالذكاء الاصطناعي</p>
        </div>
        
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                isLogin
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                !isLogin
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              حساب جديد
            </button>
          </div>
          
          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
          
          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="أدخل اسم المستخدم"
                  required
                />
              </div>
              
              <div>
                <label className="label">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="أدخل كلمة المرور"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    جاري الدخول...
                  </span>
                ) : (
                  'دخول'
                )}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">الاسم بالعربية</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="input"
                  placeholder="أدخل اسمك الكامل"
                />
              </div>
              
              <div>
                <label className="label">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="اختر اسم مستخدم"
                  required
                />
              </div>
              
              <div>
                <label className="label">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="example@email.com"
                  required
                />
              </div>
              
              <div>
                <label className="label">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="8 أحرف على الأقل"
                  required
                  minLength={8}
                />
              </div>
              
              <div>
                <label className="label">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="input"
                  placeholder="أعد إدخال كلمة المرور"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    جاري إنشاء الحساب...
                  </span>
                ) : (
                  'إنشاء حساب'
                )}
              </button>
            </form>
          )}
          
          {/* Demo Login */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-3">للتجربة السريعة:</p>
            <button
              onClick={() => {
                setUsername('demo');
                setPassword('demo1234');
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              استخدم حساب تجريبي
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          منصة توليد التقارير © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
