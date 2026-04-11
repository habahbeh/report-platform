export interface Contributor {
  id: string;
  entity: number;
  entity_name: string;
  entity_priority: string;
  name: string;
  email: string;
  phone: string;
  invite_token: string;
  status: string;
  progress: number;
  items_count: number;
  completed_items_count: number;
  invite_sent_at: string | null;
  submitted_at: string | null;
}

export interface ResponseData {
  id: string;
  item: number;
  item_code: string;
  item_name: string;
  value: any;
  display_value: string;
  is_valid: boolean;
  admin_value: any;
  admin_note: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  period: string;
  period_start: string;
  period_end: string;
  status: string;
  deadline: string | null;
  days_remaining: number | null;
  progress: number;
  items_progress: number;
  contributors_count: number;
  template: {
    id: number;
    name: string;
    axes_count: number;
    items_count: number;
    entities_count: number;
  };
  organization: {
    id: number;
    name: string;
  } | null;
  contributors: Contributor[];
  generated_reports: any[];
  created_at: string;
}

export const statusConfig: Record<string, { label: string; color: string; next: string | null; nextLabel: string }> = {
  draft:      { label: 'مسودة',         color: 'bg-gray-100 text-gray-700',   next: 'collecting', nextLabel: 'بدء جمع البيانات' },
  collecting: { label: 'جمع البيانات',  color: 'bg-blue-100 text-blue-700',   next: 'reviewing',  nextLabel: 'إنهاء الجمع والمراجعة' },
  reviewing:  { label: 'مراجعة',        color: 'bg-yellow-100 text-yellow-700', next: 'generating', nextLabel: 'توليد التقرير' },
  generating: { label: 'جاري التوليد', color: 'bg-purple-100 text-purple-700', next: 'published',  nextLabel: 'نشر التقرير' },
  published:  { label: 'منشور',         color: 'bg-green-100 text-green-700',  next: null,         nextLabel: '' },
  archived:   { label: 'مؤرشف',         color: 'bg-gray-100 text-gray-500',   next: null,         nextLabel: '' },
};

export const contributorStatusLabels: Record<string, string> = {
  pending:     'معلق',
  invited:     'تم الدعوة',
  in_progress: 'جاري الإدخال',
  submitted:   'تم الإرسال',
  completed:   'مكتمل',
  rejected:    'مرفوض',
};

export const contributorStatusColors: Record<string, string> = {
  pending:     'bg-gray-100 text-gray-600',
  invited:     'bg-blue-100 text-blue-600',
  in_progress: 'bg-yellow-100 text-yellow-700',
  submitted:   'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-600',
};
