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

    logout: () =>
      fetchAPI('/accounts/logout/', { method: 'POST' }).catch(() => {}),
  },

  // ==================
  // Organizations
  // ==================
  organizations: {
    list: () => fetchAPI('/organizations/'),
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
    delete: (id: number) =>
      fetchAPI(`/templates/templates/${id}/`, { method: 'DELETE' }),
    duplicate: (id: number, name?: string) =>
      fetchAPI(`/templates/templates/${id}/duplicate/`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
  },

  // ==================
  // Projects
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
    generate: (id: string, format?: string, options?: any) =>
      fetchAPI(`/reports/projects/${id}/generate/`, {
        method: 'POST',
        body: JSON.stringify({ format: format || 'docx', options }),
      }),
    reports: (id: string) => fetchAPI(`/reports/projects/${id}/reports/`),

    // Skeleton-First Workflow
    analyzeReport: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return uploadFile('/reports/analyze-report/', formData);
    },
    skeletonStatus: (id: string) => fetchAPI(`/reports/projects/${id}/skeleton-status/`),
    buildSkeleton: (id: string) =>
      fetchAPI(`/reports/build-skeleton/`, {
        method: 'POST',
        body: JSON.stringify({ project_id: id }),
      }),
    generateText: (id: string, options?: { model?: string; structure_id?: string }) =>
      fetchAPI(`/reports/generate-text/`, {
        method: 'POST',
        body: JSON.stringify({ project_id: id, ...options }),
      }),
  },

  // ==================
  // Structures (ItemStructure)
  // ==================
  structures: {
    list: async (projectId?: string) => {
      const query = projectId ? `?project=${projectId}&page_size=200` : '?page_size=200';
      const first = await fetchAPI(`/reports/structures/${query}`);
      // Fetch all pages if paginated
      if (first.results && first.next) {
        let all = [...first.results];
        let nextUrl = first.next;
        while (nextUrl) {
          const urlObj = new URL(nextUrl);
          const page = await fetchAPI(`/reports/structures/${urlObj.search}`);
          all = [...all, ...(page.results || [])];
          nextUrl = page.next;
        }
        return { ...first, results: all, next: null };
      }
      return first;
    },
    update: (id: string, data: any) =>
      fetchAPI(`/reports/structures/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // ==================
  // Generated Contents
  // ==================
  generatedContents: {
    list: (params?: { project?: string; structure?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.project) query.append('project', params.project);
      if (params?.structure) query.append('item_structure', params.structure);
      if (params?.status) query.append('status', params.status);
      return fetchAPI(`/reports/generated-contents/?${query.toString()}`);
    },
    edit: (id: string, content: string) =>
      fetchAPI(`/reports/generated-contents/${id}/edit/`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    approve: (id: string) =>
      fetchAPI(`/reports/generated-contents/${id}/approve/`, { method: 'POST' }),
    regenerate: (id: string, options?: { model?: string; extra_instructions?: string }) =>
      fetchAPI(`/reports/generated-contents/${id}/regenerate/`, {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }),
  },

  // ==================
  // Table Data
  // ==================
  tableData: {
    list: (params?: { project?: string; table_definition?: string }) => {
      const query = new URLSearchParams();
      if (params?.project) query.append('project', params.project);
      if (params?.table_definition) query.append('table_definition', params.table_definition);
      return fetchAPI(`/reports/table-data/?${query.toString()}`);
    },
    updateRows: (id: string, rows: any[]) =>
      fetchAPI(`/reports/table-data/${id}/update_rows/`, {
        method: 'POST',
        body: JSON.stringify({ rows }),
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
    excelTemplateUrl: (token: string, itemId: number) =>
      `${API_URL}/reports/contribute/${token}/excel-template/${itemId}/`,
  },

  // ==================
  // Templates (Extended)
  // ==================
  templatesFull: {
    getFull: (id: number) => fetchAPI(`/templates/templates/${id}/full/`),
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
  },

  entities: {
    list: (templateId?: number) => {
      const query = templateId ? `?template=${templateId}` : '';
      return fetchAPI(`/templates/entities/${query}`);
    },
  },
};

export default api;
