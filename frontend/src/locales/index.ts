export { ar, type Translations } from './ar';
export { en } from './en';

export type Language = 'ar' | 'en';

export const languages: { code: Language; name: string; nativeName: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
];
