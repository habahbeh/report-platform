/**
 * API Client for Report Platform
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api';

// Token storage
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
}

// Base fetch function
async function fetchAPI(endpoint: string, options?: RequestInit) {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Token ${token}`;
  }
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (res.status === 401) {
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('غير مصرح');
  }
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'خطأ في الخادم' }));
    throw new Error(error.detail || error.error || `خطأ: ${res.status}`);
  }
  
  return res.json();
}

// Upload function for files
async function uploadFile(endpoint: string, formData: FormData) {
  const token = getAuthToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'خطأ في الرفع' }));
    throw new Error(error.detail || error.error || `خطأ: ${res.status}`);
  }
  
  return res.json();
}

// Download function
async function downloadFile(endpoint: string, filename: string) {
  const token = getAuthToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers,
  });
  
  if (!res.ok) {
    throw new Error('فشل في التحميل');
  }
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

// API object with all endpoints
export const api = {
  // ==================
  // Authentication
  // ==================
  auth: {
    login: (username: string, password: string) =>
      fetchAPI('/accounts/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    
    register: (data: {
      username: string;
      email: string;
      password: string;
      password_confirm: string;
      name_ar?: string;
    }) =>
      fetchAPI('/accounts/register/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    logout: () =>
      fetchAPI('/accounts/logout/', { method: 'POST' }),
    
    me: () => fetchAPI('/accounts/me/'),
    
    updateProfile: (data: any) =>
      fetchAPI('/accounts/profile/', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    changePassword: (data: {
      old_password: string;
      new_password: string;
      new_password_confirm: string;
    }) =>
      fetchAPI('/accounts/change-password/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  
  // ==================
  // Organizations
  // ==================
  organizations: {
    list: () => fetchAPI('/organizations/'),
    get: (id: number) => fetchAPI(`/organizations/${id}/`),
    create: (data: any) =>
      fetchAPI('/organizations/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      fetchAPI(`/organizations/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  
  // ==================
  // Templates
  // ==================
  templates: {
    list: () => fetchAPI('/templates/templates/'),
    get: (id: number) => fetchAPI(`/templates/templates/${id}/`),
    create: (data: any) =>
      fetchAPI('/templates/templates/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      fetchAPI(`/templates/templates/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchAPI(`/templates/templates/${id}/`, { method: 'DELETE' }),
    duplicate: (id: number, name?: string) =>
      fetchAPI(`/templates/templates/${id}/duplicate/`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    
    // Sections
    sections: {
      list: (templateId: number) => fetchAPI(`/templates/${templateId}/sections/`),
      create: (templateId: number, data: any) =>
        fetchAPI(`/templates/${templateId}/sections/`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      reorder: (templateId: number, order: number[]) =>
        fetchAPI(`/templates/${templateId}/sections/reorder/`, {
          method: 'POST',
          body: JSON.stringify({ order }),
        }),
    },
  },
  
  // ==================
  // Reports
  // ==================
  reports: {
    list: (params?: { status?: string; organization?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.organization) query.append('organization', String(params.organization));
      return fetchAPI(`/reports/?${query.toString()}`);
    },
    get: (id: number) => fetchAPI(`/reports/${id}/`),
    create: (data: {
      title: string;
      template: number;
      organization?: number;
      period_start: string;
      period_end: string;
    }) =>
      fetchAPI('/reports/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      fetchAPI(`/reports/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchAPI(`/reports/${id}/`, { method: 'DELETE' }),
    
    // Generation
    generate: (id: number) =>
      fetchAPI(`/reports/${id}/generate/`, { method: 'POST' }),
    status: (id: number) => fetchAPI(`/reports/${id}/status/`),
    
    // Sections
    sections: {
      list: (reportId: number) => fetchAPI(`/reports/${reportId}/sections/`),
      update: (sectionId: number, data: any) =>
        fetchAPI(`/reports/sections/${sectionId}/`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      generate: (sectionId: number) =>
        fetchAPI(`/reports/sections/${sectionId}/generate/`, { method: 'POST' }),
      regenerate: (sectionId: number, prompt?: string) =>
        fetchAPI(`/reports/sections/${sectionId}/regenerate/`, {
          method: 'POST',
          body: JSON.stringify({ prompt }),
        }),
    },
    
    // Images
    images: {
      list: (reportId: number) => fetchAPI(`/reports/${reportId}/images/`),
      upload: (reportId: number, formData: FormData) =>
        uploadFile(`/reports/${reportId}/images/`, formData),
      delete: (reportId: number, imageId: number) =>
        fetchAPI(`/reports/${reportId}/images/${imageId}/`, { method: 'DELETE' }),
    },
  },
  
  // ==================
  // AI Generation
  // ==================
  ai: {
    generate: (data: {
      section_id?: number;
      section_title: string;
      prompt: string;
      data?: any;
      word_count?: number;
      model?: 'cli' | 'claude' | 'gemini';
    }) =>
      fetchAPI('/ai/generate/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    generateIntro: (data: {
      organization_name?: string;
      period?: string;
      highlights?: string[];
      model?: 'cli' | 'claude' | 'gemini';
    }) =>
      fetchAPI('/ai/generate/intro/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    generateResearch: (data: {
      publications_count: number;
      citations_count: number;
      h_index: number;
      funded_projects?: number;
      patents?: number;
      by_faculty?: Record<string, number>;
      model?: 'cli' | 'claude' | 'gemini';
    }) =>
      fetchAPI('/ai/generate/research/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    generateConclusion: (data: {
      key_achievements?: string[];
      challenges?: string[];
      future_plans?: string[];
      model?: 'cli' | 'claude' | 'gemini';
    }) =>
      fetchAPI('/ai/generate/conclusion/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  
  // ==================
  // Export
  // ==================
  export: {
    toWord: (reportId: number) =>
      fetchAPI(`/export/${reportId}/export/`, {
        method: 'POST',
        body: JSON.stringify({ format: 'docx' }),
      }),
    toPdf: (reportId: number) =>
      fetchAPI(`/export/${reportId}/export/`, {
        method: 'POST',
        body: JSON.stringify({ format: 'pdf' }),
      }),
    download: (reportId: number, format: 'docx' | 'pdf') =>
      downloadFile(`/export/${reportId}/export/?format=${format}`, `report.${format}`),
    preview: (reportId: number) => `${API_URL}/export/${reportId}/preview/`,
    jobs: {
      list: () => fetchAPI('/export/jobs/'),
      get: (id: string) => fetchAPI(`/export/jobs/${id}/`),
      delete: (id: string) => fetchAPI(`/export/jobs/${id}/`, { method: 'DELETE' }),
    },
    create: (data: {
      project: string;
      format: string;
      options: any;
    }) =>
      fetchAPI('/export/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ==================
  // Review
  // ==================
  review: {
    data: {
      list: (params?: { status?: string }) => {
        const query = new URLSearchParams();
        if (params?.status && params.status !== 'all') query.append('status', params.status);
        return fetchAPI(`/review/data/?${query.toString()}`);
      },
      approve: (id: number) =>
        fetchAPI(`/review/data/${id}/approve/`, { method: 'POST' }),
      reject: (id: number, notes: string) =>
        fetchAPI(`/review/data/${id}/reject/`, {
          method: 'POST',
          body: JSON.stringify({ notes }),
        }),
    },
    content: {
      list: (params?: { status?: string }) => {
        const query = new URLSearchParams();
        if (params?.status) query.append('status', params.status);
        return fetchAPI(`/review/content/?${query.toString()}`);
      },
      approve: (id: number) =>
        fetchAPI(`/review/content/${id}/approve/`, { method: 'POST' }),
      reject: (id: number, notes: string) =>
        fetchAPI(`/review/content/${id}/reject/`, {
          method: 'POST',
          body: JSON.stringify({ notes }),
        }),
    },
  },
  
  // ==================
  // Projects (New System)
  // ==================
  projects: {
    list: (params?: { status?: string; organization?: string; template?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.organization) query.append('organization', params.organization);
      if (params?.template) query.append('template', params.template);
      return fetchAPI(`/reports/projects/?${query.toString()}`);
    },
    get: (id: string) => fetchAPI(`/reports/projects/${id}/`),
    create: (data: {
      name: string;
      period: string;
      period_start: string;
      period_end: string;
      template: number;
      organization?: number;
      deadline?: string;
    }) =>
      fetchAPI('/reports/projects/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchAPI(`/reports/projects/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI(`/reports/projects/${id}/`, { method: 'DELETE' }),
    
    // Project actions
    stats: (id: string) => fetchAPI(`/reports/projects/${id}/stats/`),
    contributors: (id: string) => fetchAPI(`/reports/projects/${id}/contributors/`),
    addContributor: (id: string, data: any) =>
      fetchAPI(`/reports/projects/${id}/add_contributor/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    invite: (id: string, contributorIds?: string[]) =>
      fetchAPI(`/reports/projects/${id}/invite/`, {
        method: 'POST',
        body: JSON.stringify({ contributor_ids: contributorIds || 'all' }),
      }),
    remind: (id: string, contributorIds?: string[]) =>
      fetchAPI(`/reports/projects/${id}/remind/`, {
        method: 'POST',
        body: JSON.stringify({ contributor_ids: contributorIds || 'incomplete' }),
      }),
    aggregated: (id: string) => fetchAPI(`/reports/projects/${id}/aggregated/`),
    generate: (id: string, format?: string, options?: any) =>
      fetchAPI(`/reports/projects/${id}/generate/`, {
        method: 'POST',
        body: JSON.stringify({ format: format || 'docx', options }),
      }),
    generateStatus: (projectId: string, reportId: string) =>
      fetchAPI(`/reports/projects/${projectId}/generate-status/${reportId}/`),
    reports: (id: string) => fetchAPI(`/reports/projects/${id}/reports/`),
  },

  // ==================
  // Contributors
  // ==================
  contributors: {
    list: () => fetchAPI('/reports/contributors/'),
    get: (id: string) => fetchAPI(`/reports/contributors/${id}/`),
    update: (id: string, data: any) =>
      fetchAPI(`/reports/contributors/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    approve: (id: string) =>
      fetchAPI(`/reports/contributors/${id}/approve/`, { method: 'POST' }),
    reject: (id: string, reason?: string) =>
      fetchAPI(`/reports/contributors/${id}/reject/`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  // ==================
  // Public Contribute API (No Auth)
  // ==================
  contribute: {
    getForm: (token: string) => fetchAPI(`/reports/contribute/${token}/`),
    save: (token: string, responses: any[]) =>
      fetchAPI(`/reports/contribute/${token}/save/`, {
        method: 'POST',
        body: JSON.stringify({ responses }),
      }),
    submit: (token: string) =>
      fetchAPI(`/reports/contribute/${token}/submit/`, { method: 'POST' }),
    upload: (token: string, itemId: string, file: File) => {
      const formData = new FormData();
      formData.append('item_id', itemId);
      formData.append('file', file);
      return uploadFile(`/reports/contribute/${token}/upload/`, formData);
    },
  },

  // ==================
  // Templates (Extended)
  // ==================
  templatesFull: {
    getFull: (id: number) => fetchAPI(`/templates/templates/${id}/full/`),
    axes: (id: number) => fetchAPI(`/templates/templates/${id}/axes/`),
    items: (id: number) => fetchAPI(`/templates/templates/${id}/items/`),
    entities: (id: number) => fetchAPI(`/templates/templates/${id}/entities/`),
    tables: (id: number) => fetchAPI(`/templates/templates/${id}/tables/`),
    charts: (id: number) => fetchAPI(`/templates/templates/${id}/charts/`),
  },

  // ==================
  // Axes, Items, Entities
  // ==================
  axes: {
    list: (templateId?: number) => {
      const query = templateId ? `?template=${templateId}` : '';
      return fetchAPI(`/templates/axes/${query}`);
    },
    get: (id: number) => fetchAPI(`/templates/axes/${id}/`),
    create: (data: any) =>
      fetchAPI('/templates/axes/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      fetchAPI(`/templates/axes/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchAPI(`/templates/axes/${id}/`, { method: 'DELETE' }),
    items: (id: number) => fetchAPI(`/templates/axes/${id}/items/`),
  },

  items: {
    list: (params?: { axis?: number; template?: number; field_type?: string }) => {
      const query = new URLSearchParams();
      if (params?.axis) query.append('axis', String(params.axis));
      if (params?.template) query.append('template', String(params.template));
      if (params?.field_type) query.append('field_type', params.field_type);
      return fetchAPI(`/templates/items/?${query.toString()}`);
    },
    get: (id: number) => fetchAPI(`/templates/items/${id}/`),
    create: (data: any) =>
      fetchAPI('/templates/items/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      fetchAPI(`/templates/items/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchAPI(`/templates/items/${id}/`, { method: 'DELETE' }),
  },

  entities: {
    list: (templateId?: number) => {
      const query = templateId ? `?template=${templateId}` : '';
      return fetchAPI(`/templates/entities/${query}`);
    },
    get: (id: number) => fetchAPI(`/templates/entities/${id}/`),
    create: (data: any) =>
      fetchAPI('/templates/entities/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      fetchAPI(`/templates/entities/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchAPI(`/templates/entities/${id}/`, { method: 'DELETE' }),
    items: (id: number) => fetchAPI(`/templates/entities/${id}/items/`),
  },

  // ==================
  // Data Collection
  // ==================
  data: {
    // Statistics
    stats: () => fetchAPI('/data/stats/'),
    
    // Collection Periods
    periods: {
      list: (params?: { status?: string; year?: string }) => {
        const query = new URLSearchParams();
        if (params?.status) query.append('status', params.status);
        if (params?.year) query.append('year', params.year);
        return fetchAPI(`/data/periods/?${query.toString()}`);
      },
      get: (id: number) => fetchAPI(`/data/periods/${id}/`),
      create: (data: any) =>
        fetchAPI('/data/periods/', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: number, data: any) =>
        fetchAPI(`/data/periods/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      open: (id: number) =>
        fetchAPI(`/data/periods/${id}/open/`, { method: 'POST' }),
      close: (id: number) =>
        fetchAPI(`/data/periods/${id}/close/`, { method: 'POST' }),
      extend: (id: number, extendedDate: string) =>
        fetchAPI(`/data/periods/${id}/extend/`, {
          method: 'POST',
          body: JSON.stringify({ extended_date: extendedDate }),
        }),
      initializeSubmissions: (id: number) =>
        fetchAPI(`/data/periods/${id}/initialize_submissions/`, { method: 'POST' }),
    },
    
    // Entity Submissions
    submissions: {
      list: (params?: { period?: number; entity?: number; status?: string }) => {
        const query = new URLSearchParams();
        if (params?.period) query.append('period', String(params.period));
        if (params?.entity) query.append('entity', String(params.entity));
        if (params?.status) query.append('status', params.status);
        return fetchAPI(`/data/submissions/?${query.toString()}`);
      },
      get: (id: number) => fetchAPI(`/data/submissions/${id}/`),
      submit: (id: number, notes?: string) =>
        fetchAPI(`/data/submissions/${id}/submit/`, {
          method: 'POST',
          body: JSON.stringify({ notes: notes || '' }),
        }),
      approve: (id: number, notes?: string) =>
        fetchAPI(`/data/submissions/${id}/approve/`, {
          method: 'POST',
          body: JSON.stringify({ notes: notes || '' }),
        }),
      requestRevision: (id: number, notes: string) =>
        fetchAPI(`/data/submissions/${id}/request_revision/`, {
          method: 'POST',
          body: JSON.stringify({ notes }),
        }),
      files: (id: number) => fetchAPI(`/data/submissions/${id}/files/`),
      logs: (id: number) => fetchAPI(`/data/submissions/${id}/logs/`),
      portalLink: (id: number) => fetchAPI(`/data/submissions/${id}/portal_link/`),
      portalLinks: (periodId: number) => fetchAPI(`/data/submissions/portal_links/?period=${periodId}`),
    },
    
    // Files
    files: {
      list: (params?: { entity?: number; submission?: number; status?: string; current?: boolean }) => {
        const query = new URLSearchParams();
        if (params?.entity) query.append('entity', String(params.entity));
        if (params?.submission) query.append('submission', String(params.submission));
        if (params?.status) query.append('status', params.status);
        if (params?.current !== undefined) query.append('current', String(params.current));
        return fetchAPI(`/data/files/?${query.toString()}`);
      },
      get: (id: number) => fetchAPI(`/data/files/${id}/`),
      upload: (formData: FormData) => uploadFile('/data/files/', formData),
      parse: (id: number, type?: string) =>
        fetchAPI(`/data/files/${id}/parse/`, {
          method: 'POST',
          body: JSON.stringify({ type }),
        }),
      approve: (id: number, notes?: string) =>
        fetchAPI(`/data/files/${id}/approve/`, {
          method: 'POST',
          body: JSON.stringify({ notes: notes || '' }),
        }),
      reject: (id: number, notes?: string) =>
        fetchAPI(`/data/files/${id}/reject/`, {
          method: 'POST',
          body: JSON.stringify({ notes: notes || '' }),
        }),
      requestRevision: (id: number, notes: string) =>
        fetchAPI(`/data/files/${id}/request_revision/`, {
          method: 'POST',
          body: JSON.stringify({ notes }),
        }),
      newVersion: (id: number, formData: FormData) =>
        uploadFile(`/data/files/${id}/new_version/`, formData),
      versions: (id: number) => fetchAPI(`/data/files/${id}/versions/`),
      logs: (id: number) => fetchAPI(`/data/files/${id}/logs/`),
    },
    
    // Review Logs
    logs: {
      list: (params?: { action?: string; user?: number }) => {
        const query = new URLSearchParams();
        if (params?.action) query.append('action', params.action);
        if (params?.user) query.append('user', String(params.user));
        return fetchAPI(`/data/logs/?${query.toString()}`);
      },
    },
    
    // Sources (legacy)
    sources: {
      list: () => fetchAPI('/data/sources/'),
      get: (id: number) => fetchAPI(`/data/sources/${id}/`),
      create: (data: any) =>
        fetchAPI('/data/sources/', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      sync: (id: number) =>
        fetchAPI(`/data/sources/${id}/sync/`, { method: 'POST' }),
      test: (id: number) =>
        fetchAPI(`/data/sources/${id}/test/`, { method: 'POST' }),
    },
    
    // Requests (legacy)
    requests: {
      list: () => fetchAPI('/data/requests/'),
      get: (id: number) => fetchAPI(`/data/requests/${id}/`),
      create: (data: any) =>
        fetchAPI('/data/requests/', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      remind: (id: number) =>
        fetchAPI(`/data/requests/${id}/remind/`, { method: 'POST' }),
      approve: (id: number) =>
        fetchAPI(`/data/requests/${id}/approve/`, { method: 'POST' }),
      reject: (id: number, reason?: string) =>
        fetchAPI(`/data/requests/${id}/reject/`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
    },
  },
  
  // === توليد التقارير ===
  generation: {
    // توليد محاور (واحد أو أكثر أو الكل)
    generate: (data: {
      period_id: number;
      axes?: number[];
      model?: 'gemini' | 'claude' | 'cli';
      regenerate?: boolean;
    }) =>
      fetchAPI('/reports/generate/', {
        method: 'POST',
        body: JSON.stringify({ model: 'cli', ...data }),  // default: cli
      }),
    
    // توليد بنود (واحد أو أكثر أو كل بنود محور)
    generateItems: (data: {
      period_id: number;
      items?: number[];
      axis_id?: number;
      model?: 'gemini' | 'claude' | 'cli';
      regenerate?: boolean;
    }) =>
      fetchAPI('/reports/generate-items/', {
        method: 'POST',
        body: JSON.stringify({ model: 'cli', ...data }),  // default: cli
      }),
    
    // قائمة مسودات المحاور لفترة معينة
    getDrafts: (periodId: number) =>
      fetchAPI(`/reports/periods/${periodId}/drafts/`),
    
    // قائمة مسودات البنود لفترة معينة
    getItemDrafts: (periodId: number, axisId?: number) =>
      fetchAPI(`/reports/periods/${periodId}/item-drafts/${axisId ? `?axis_id=${axisId}` : ''}`),
    
    // حالة التوليد لفترة معينة
    getStatus: (periodId: number) =>
      fetchAPI(`/reports/periods/${periodId}/generation-status/`),
    
    // مسودات المحاور
    axisDrafts: {
      list: (periodId?: number) =>
        fetchAPI(`/reports/axis-drafts/${periodId ? `?period_id=${periodId}` : ''}`),
      
      get: (id: string) =>
        fetchAPI(`/reports/axis-drafts/${id}/`),
      
      update: (id: string, data: { content?: string; content_html?: string }) =>
        fetchAPI(`/reports/axis-drafts/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      
      approve: (id: string) =>
        fetchAPI(`/reports/axis-drafts/${id}/approve/`, { method: 'POST' }),
      
      revert: (id: string) =>
        fetchAPI(`/reports/axis-drafts/${id}/revert/`, { method: 'POST' }),
      
      regenerate: (id: string, model?: string) =>
        fetchAPI(`/reports/axis-drafts/${id}/regenerate/`, {
          method: 'POST',
          body: JSON.stringify({ model: model || 'cli' }),  // default: cli
        }),
    },
    
    // مسودات البنود
    itemDrafts: {
      list: (periodId?: number, axisId?: number) => {
        const params = new URLSearchParams();
        if (periodId) params.append('period_id', String(periodId));
        if (axisId) params.append('axis_id', String(axisId));
        return fetchAPI(`/reports/item-drafts/?${params}`);
      },
      
      get: (id: string) =>
        fetchAPI(`/reports/item-drafts/${id}/`),
      
      update: (id: string, data: { content?: string }) =>
        fetchAPI(`/reports/item-drafts/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      
      approve: (id: string) =>
        fetchAPI(`/reports/item-drafts/${id}/approve/`, { method: 'POST' }),
      
      regenerate: (id: string, model?: string) =>
        fetchAPI(`/reports/item-drafts/${id}/regenerate/`, {
          method: 'POST',
          body: JSON.stringify({ model: model || 'cli' }),  // default: cli
        }),
    },
    
    // === تصدير التقارير ===
    export: {
      // معاينة محتوى التقرير
      preview: (periodId: number) =>
        fetchAPI(`/reports/periods/${periodId}/export/preview/`),
      
      // تحميل التقرير
      download: async (periodId: number, options?: {
        format?: 'docx' | 'pdf';
        includeItems?: boolean;
        includeCharts?: boolean;
        includeTables?: boolean;
        approvedOnly?: boolean;
      }) => {
        const params = new URLSearchParams();
        // Note: use 'output_format' instead of 'format' (DRF reserved)
        if (options?.format) params.append('output_format', options.format);
        if (options?.includeItems !== undefined) params.append('include_items', String(options.includeItems));
        if (options?.includeCharts !== undefined) params.append('include_charts', String(options.includeCharts));
        if (options?.includeTables !== undefined) params.append('include_tables', String(options.includeTables));
        if (options?.approvedOnly !== undefined) params.append('approved_only', String(options.approvedOnly));
        
        const queryString = params.toString();
        const url = `http://localhost:8002/api/reports/periods/${periodId}/export/${queryString ? '?' + queryString : ''}`;
        
        try {
          const response = await fetch(url, {
            method: 'GET',
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Export error:', response.status, errorText);
            throw new Error(`فشل في تحميل التقرير: ${response.status}`);
          }
          
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `التقرير_السنوي_${periodId}.docx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          a.remove();
        } catch (error) {
          console.error('Download error:', error);
          throw error;
        }
      },
    },
    
    // === المرفقات والمحتوى اليدوي ===
    attachments: {
      // قائمة مرفقات بند
      list: (itemDraftId: string) =>
        fetchAPI(`/reports/item-drafts/${itemDraftId}/attachments/`),
      
      // رفع مرفق جديد
      upload: async (file: File, itemDraftId: string, caption?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('item_draft_id', itemDraftId);
        if (caption) formData.append('caption', caption);
        return uploadFile('/reports/attachments/', formData);
      },
      
      // حذف مرفق
      delete: (attachmentId: string) =>
        fetchAPI(`/reports/attachments/${attachmentId}/`, { method: 'DELETE' }),
      
      // تحديث ترتيب/caption
      update: (attachmentId: string, data: { caption?: string; order?: number }) =>
        fetchAPI(`/reports/attachments/${attachmentId}/`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
    },
    
    // تحديث المحتوى اليدوي
    manualContent: {
      update: (itemDraftId: string, manualContent: any[]) =>
        fetchAPI(`/reports/item-drafts/${itemDraftId}/manual-content/`, {
          method: 'PATCH',
          body: JSON.stringify({ manual_content: manualContent }),
        }),
    },
    
    // سجل التعديلات
    history: {
      item: (draftId: string) =>
        fetchAPI(`/reports/item-drafts/${draftId}/history/`),
      axis: (draftId: string) =>
        fetchAPI(`/reports/axis-drafts/${draftId}/history/`),
    },
    
    // === بيانات السنة السابقة ===
    previousData: {
      // تحميل قالب Excel
      downloadTemplate: async (periodId: number) => {
        const url = `http://localhost:8002/api/reports/periods/${periodId}/previous-data/template/`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل في تحميل القالب');
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `قالب_بيانات_سابقة.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
      },
      
      // استيراد من Excel
      import: (periodId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return uploadFile(`/reports/periods/${periodId}/previous-data/import/`, formData);
      },
      
      // تصدير البيانات (مقارنة)
      export: async (periodId: number) => {
        const url = `http://localhost:8002/api/reports/periods/${periodId}/previous-data/export/`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل في تصدير البيانات');
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `مقارنة_البيانات.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
      },
      
      // سحب من الفترة السابقة تلقائياً
      pull: (periodId: number) =>
        fetchAPI(`/reports/periods/${periodId}/previous-data/pull/`, { method: 'POST' }),
    },
    
    // === قوالب المخرجات ===
    outputTemplates: {
      // قائمة القوالب
      list: () =>
        fetchAPI('/reports/output-templates/'),
      
      // قالب واحد
      get: (id: number) =>
        fetchAPI(`/reports/output-templates/${id}/`),
      
      // القالب الافتراضي
      getDefault: () =>
        fetchAPI('/reports/output-templates/default/'),
      
      // إنشاء قالب
      create: (data: {
        code: string;
        name: string;
        description?: string;
        components: Array<{
          type: 'text' | 'table' | 'chart' | 'image';
          source: 'auto' | 'manual' | 'mixed';
          title?: string;
          order?: number;
        }>;
      }) =>
        fetchAPI('/reports/output-templates/', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      
      // تحديث قالب
      update: (id: number, data: any) =>
        fetchAPI(`/reports/output-templates/${id}/`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      
      // حذف قالب
      delete: (id: number) =>
        fetchAPI(`/reports/output-templates/${id}/`, { method: 'DELETE' }),
      
      // تعيين كافتراضي
      setDefault: (id: number) =>
        fetchAPI(`/reports/output-templates/${id}/set_default/`, { method: 'POST' }),
      
      // نسخ قالب
      duplicate: (id: number) =>
        fetchAPI(`/reports/output-templates/${id}/duplicate/`, { method: 'POST' }),
    },
    
    // === إعدادات مخرجات البنود ===
    outputConfig: {
      // جلب إعدادات بند
      get: (itemDraftId: string) =>
        fetchAPI(`/reports/item-drafts/${itemDraftId}/output-config/`),
      
      // تحديث إعدادات بند
      set: (itemDraftId: string, data: {
        output_template_id?: number | null;
        custom_components?: Array<{
          type: 'text' | 'table' | 'chart' | 'image';
          enabled: boolean;
          order: number;
          source?: 'auto' | 'manual' | 'mixed';
        }>;
      }) =>
        fetchAPI(`/reports/item-drafts/${itemDraftId}/output-config/set/`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      
      // تحديث عدة بنود
      setBulk: (data: {
        item_draft_ids: string[];
        output_template_id: number;
      }) =>
        fetchAPI('/reports/item-drafts/bulk-output-config/', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
  },
};

export default api;
