export const ar = {
  // Direction
  dir: 'rtl',

  // Navigation Groups
  nav: {
    main: 'الرئيسية',
    dashboard: 'لوحة التحكم',
    templates: 'القوالب',
    dataCollection: 'جمع البيانات',
    review: 'المراجعة',
    generation: 'التوليد',
    export: 'التصدير',
  },

  // Navigation Items
  navItems: {
    dashboard: 'لوحة التحكم',
    settings: 'الإعدادات',
    templates: 'القوالب',
    structure: 'المحاور والبنود',
    entities: 'الجهات',
    periods: 'فترات الجمع',
    newPeriod: 'فترة جمع جديدة',
    submissions: 'تسليمات الجهات',
    files: 'الملفات',
    importData: 'استيراد البيانات',
    dataReview: 'مراجعة الملفات',
    contentReview: 'مراجعة المحتوى',
    aiGeneration: 'توليد بالـ AI',
    drafts: 'المسودات',
    manualContent: 'المحتوى اليدوي',
    exportReport: 'تصدير التقرير',
    reports: 'التقارير السابقة',
    logout: 'خروج',
  },

  // Common
  common: {
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    filter: 'فلترة',
    noData: 'لا توجد بيانات',
    actions: 'إجراءات',
    status: 'الحالة',
    date: 'التاريخ',
    name: 'الاسم',
    description: 'الوصف',
    type: 'النوع',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    submit: 'إرسال',
    confirm: 'تأكيد',
    close: 'إغلاق',
    create: 'إنشاء',
    update: 'تحديث',
    view: 'عرض',
    download: 'تحميل',
    upload: 'رفع',
    refresh: 'تحديث',
    all: 'الكل',
    yes: 'نعم',
    no: 'لا',
  },

  // App
  app: {
    name: 'تقرير.ai',
    tagline: 'منصة التقارير الذكية',
  },

  // Dashboard
  dashboard: {
    title: 'لوحة التحكم',
    welcome: 'مرحباً',
    overview: 'نظرة عامة',
    recentProjects: 'المشاريع الأخيرة',
    quickActions: 'إجراءات سريعة',
    statistics: 'الإحصائيات',
    activeProjects: 'مشاريع نشطة',
    totalTemplates: 'إجمالي القوالب',
    pendingReviews: 'مراجعات معلقة',
    completedReports: 'تقارير مكتملة',
  },

  // Templates
  templates: {
    title: 'القوالب',
    createNew: 'قالب جديد',
    edit: 'تعديل القالب',
    duplicate: 'نسخ القالب',
    noTemplates: 'لا توجد قوالب',
    templateName: 'اسم القالب',
    axes: 'المحاور',
    items: 'البنود',
    entitiesCount: 'عدد الجهات',
  },

  // Projects
  projects: {
    title: 'المشاريع',
    createNew: 'مشروع جديد',
    edit: 'تعديل المشروع',
    noProjects: 'لا توجد مشاريع',
    projectName: 'اسم المشروع',
    template: 'القالب',
    period: 'الفترة',
    year: 'السنة',
    progress: 'التقدم',
    startCollection: 'بدء الجمع',
    projectInfo: 'معلومات المشروع',
    recentActivity: 'النشاط الأخير',
    noActivity: 'لا يوجد نشاط',
    participatingEntities: 'جهة مشاركة',
    submitted: 'تم الإرسال',
    axis: 'محور',
    item: 'بند',
    dataProgress: 'تقدم جمع البيانات',
    entitiesSent: 'جهة أرسلت بياناتها',
    from: 'من',
  },

  // Project Status
  status: {
    draft: 'مسودة',
    collecting: 'جمع البيانات',
    reviewing: 'مراجعة',
    generating: 'إنشاء التقرير',
    completed: 'مكتمل',
    pending: 'معلق',
    approved: 'معتمد',
    rejected: 'مرفوض',
  },

  // Period Types
  periodTypes: {
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    semi_annual: 'نصف سنوي',
    annual: 'سنوي',
  },

  // Workflow Steps
  workflow: {
    dataCollection: 'جمع البيانات',
    review: 'المراجعة',
    reportGeneration: 'إنشاء التقرير',
    export: 'التصدير',
  },

  // Data Collection
  data: {
    periods: 'فترات الجمع',
    submissions: 'التسليمات',
    files: 'الملفات',
    uploadFile: 'رفع ملف',
    selectPeriod: 'اختر الفترة',
    selectEntity: 'اختر الجهة',
  },

  // Review
  review: {
    dataReview: 'مراجعة البيانات',
    contentReview: 'مراجعة المحتوى',
    approve: 'اعتماد',
    reject: 'رفض',
    addComment: 'إضافة تعليق',
    comments: 'التعليقات',
  },

  // Generation
  generation: {
    title: 'توليد التقرير',
    startGeneration: 'بدء التوليد',
    stopGeneration: 'إيقاف التوليد',
    generating: 'جاري التوليد...',
    aiPowered: 'مدعوم بالذكاء الاصطناعي',
  },

  // Export
  export: {
    title: 'تصدير التقرير',
    format: 'صيغة الملف',
    exportAs: 'تصدير كـ',
    pdf: 'PDF',
    word: 'Word',
    excel: 'Excel',
  },

  // Settings
  settings: {
    title: 'الإعدادات',
    profile: 'الملف الشخصي',
    language: 'اللغة',
    theme: 'المظهر',
    notifications: 'الإشعارات',
    security: 'الأمان',
    changePassword: 'تغيير كلمة المرور',
    arabic: 'العربية',
    english: 'English',
    lightMode: 'فاتح',
    darkMode: 'داكن',
    systemMode: 'حسب النظام',
  },

  // Auth
  auth: {
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
  },

  // Errors
  errors: {
    notFound: 'غير موجود',
    projectNotFound: 'المشروع غير موجود',
    unauthorized: 'غير مصرح',
    serverError: 'خطأ في الخادم',
    networkError: 'خطأ في الاتصال',
    tryAgain: 'حاول مرة أخرى',
    returnToProjects: 'العودة للمشاريع',
  },

  // Messages
  messages: {
    projectCreated: 'تم إنشاء المشروع بنجاح',
    projectUpdated: 'تم تحديث المشروع بنجاح',
    projectDeleted: 'تم حذف المشروع بنجاح',
    savedSuccessfully: 'تم الحفظ بنجاح',
    deletedSuccessfully: 'تم الحذف بنجاح',
    confirmDelete: 'هل أنت متأكد من الحذف؟',
  },
};

export type Translations = typeof ar;
