import type { Translations } from './ar';

export const en: Translations = {
  // Direction
  dir: 'ltr',

  // Navigation Groups
  nav: {
    main: 'Main',
    dashboard: 'Dashboard',
    templates: 'Templates',
    dataCollection: 'Data Collection',
    review: 'Review',
    generation: 'Generation',
    export: 'Export',
  },

  // Navigation Items
  navItems: {
    dashboard: 'Dashboard',
    settings: 'Settings',
    templates: 'Templates',
    structure: 'Axes & Items',
    entities: 'Entities',
    periods: 'Collection Periods',
    newPeriod: 'New Collection Period',
    submissions: 'Entity Submissions',
    files: 'Files',
    importData: 'Import Data',
    dataReview: 'File Review',
    contentReview: 'Content Review',
    aiGeneration: 'AI Generation',
    drafts: 'Drafts',
    manualContent: 'Manual Content',
    exportReport: 'Export Report',
    reports: 'Previous Reports',
    logout: 'Logout',
  },

  // Common
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    noData: 'No data available',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    name: 'Name',
    description: 'Description',
    type: 'Type',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    confirm: 'Confirm',
    close: 'Close',
    create: 'Create',
    update: 'Update',
    view: 'View',
    download: 'Download',
    upload: 'Upload',
    refresh: 'Refresh',
    all: 'All',
    yes: 'Yes',
    no: 'No',
  },

  // App
  app: {
    name: 'Taqrir.ai',
    tagline: 'Smart Reports Platform',
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome',
    overview: 'Overview',
    recentProjects: 'Recent Projects',
    quickActions: 'Quick Actions',
    statistics: 'Statistics',
    activeProjects: 'Active Projects',
    totalTemplates: 'Total Templates',
    pendingReviews: 'Pending Reviews',
    completedReports: 'Completed Reports',
  },

  // Templates
  templates: {
    title: 'Templates',
    createNew: 'New Template',
    edit: 'Edit Template',
    duplicate: 'Duplicate Template',
    noTemplates: 'No templates available',
    templateName: 'Template Name',
    axes: 'Axes',
    items: 'Items',
    entitiesCount: 'Entities Count',
  },

  // Projects
  projects: {
    title: 'Projects',
    createNew: 'New Project',
    edit: 'Edit Project',
    noProjects: 'No projects available',
    projectName: 'Project Name',
    template: 'Template',
    period: 'Period',
    year: 'Year',
    progress: 'Progress',
    startCollection: 'Start Collection',
    projectInfo: 'Project Information',
    recentActivity: 'Recent Activity',
    noActivity: 'No activity',
    participatingEntities: 'participating entity',
    submitted: 'Submitted',
    axis: 'axis',
    item: 'item',
    dataProgress: 'Data Collection Progress',
    entitiesSent: 'entity sent their data',
    from: 'from',
  },

  // Project Status
  status: {
    draft: 'Draft',
    collecting: 'Data Collection',
    reviewing: 'Reviewing',
    generating: 'Generating Report',
    completed: 'Completed',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  },

  // Period Types
  periodTypes: {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    semi_annual: 'Semi-Annual',
    annual: 'Annual',
  },

  // Workflow Steps
  workflow: {
    dataCollection: 'Data Collection',
    review: 'Review',
    reportGeneration: 'Report Generation',
    export: 'Export',
  },

  // Data Collection
  data: {
    periods: 'Collection Periods',
    submissions: 'Submissions',
    files: 'Files',
    uploadFile: 'Upload File',
    selectPeriod: 'Select Period',
    selectEntity: 'Select Entity',
  },

  // Review
  review: {
    dataReview: 'Data Review',
    contentReview: 'Content Review',
    approve: 'Approve',
    reject: 'Reject',
    addComment: 'Add Comment',
    comments: 'Comments',
  },

  // Generation
  generation: {
    title: 'Report Generation',
    startGeneration: 'Start Generation',
    stopGeneration: 'Stop Generation',
    generating: 'Generating...',
    aiPowered: 'AI Powered',
  },

  // Export
  export: {
    title: 'Export Report',
    format: 'File Format',
    exportAs: 'Export as',
    pdf: 'PDF',
    word: 'Word',
    excel: 'Excel',
  },

  // Settings
  settings: {
    title: 'Settings',
    profile: 'Profile',
    language: 'Language',
    theme: 'Theme',
    notifications: 'Notifications',
    security: 'Security',
    changePassword: 'Change Password',
    arabic: 'العربية',
    english: 'English',
    lightMode: 'Light',
    darkMode: 'Dark',
    systemMode: 'System',
  },

  // Auth
  auth: {
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
  },

  // Errors
  errors: {
    notFound: 'Not Found',
    projectNotFound: 'Project not found',
    unauthorized: 'Unauthorized',
    serverError: 'Server Error',
    networkError: 'Network Error',
    tryAgain: 'Try again',
    returnToProjects: 'Return to Projects',
  },

  // Messages
  messages: {
    projectCreated: 'Project created successfully',
    projectUpdated: 'Project updated successfully',
    projectDeleted: 'Project deleted successfully',
    savedSuccessfully: 'Saved successfully',
    deletedSuccessfully: 'Deleted successfully',
    confirmDelete: 'Are you sure you want to delete?',
  },
};
