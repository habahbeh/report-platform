'use client';

import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/ui/motion';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  FileX,
  FolderOpen,
  Inbox,
  Search,
  Plus,
  Upload,
  FileText,
  Calendar,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'upload' | 'error';
}

const variantIcons: Record<string, LucideIcon> = {
  default: Inbox,
  search: Search,
  upload: Upload,
  error: FileX,
};

const variantColors: Record<string, string> = {
  default: 'text-muted-foreground bg-muted/30',
  search: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',
  upload: 'text-green-500 bg-green-50 dark:bg-green-950/30',
  error: 'text-red-500 bg-red-50 dark:bg-red-950/30',
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];
  const colorClass = variantColors[variant];

  return (
    <FadeIn className="flex flex-col items-center justify-center py-16 px-4">
      {/* Illustration Circle */}
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${colorClass}`}>
        <Icon size={40} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Action */}
      {(actionLabel && (actionHref || onAction)) && (
        actionHref ? (
          <Button asChild className="gradient-primary shadow-lg shadow-blue-500/20">
            <Link href={actionHref}>
              <Plus size={18} />
              <span>{actionLabel}</span>
            </Link>
          </Button>
        ) : (
          <Button onClick={onAction} className="gradient-primary shadow-lg shadow-blue-500/20">
            <Plus size={18} />
            <span>{actionLabel}</span>
          </Button>
        )
      )}
    </FadeIn>
  );
}

// Pre-configured empty states for common use cases
export function NoTemplates() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={FileText}
      title={t.templates.noTemplates}
      description="أنشئ قالبك الأول لبدء جمع البيانات وتوليد التقارير"
      actionLabel={t.templates.createNew}
      actionHref="/dashboard/templates/new"
    />
  );
}

export function NoPeriods() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Calendar}
      title="لا توجد فترات جمع"
      description="أنشئ فترة جمع جديدة لبدء استلام البيانات من الجهات"
      actionLabel={t.navItems.newPeriod}
      actionHref="/dashboard/data/periods/new"
    />
  );
}

export function NoSubmissions() {
  return (
    <EmptyState
      icon={Inbox}
      title="لا توجد تسليمات"
      description="لم تقم أي جهة بتسليم بياناتها بعد"
    />
  );
}

export function NoFiles() {
  return (
    <EmptyState
      icon={FolderOpen}
      title="لا توجد ملفات"
      description="لم يتم رفع أي ملفات بعد"
      variant="upload"
    />
  );
}

export function NoSearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      variant="search"
      title="لا توجد نتائج"
      description={query ? `لم نجد نتائج لـ "${query}"` : 'جرب تغيير معايير البحث'}
    />
  );
}

export function NoEntities() {
  return (
    <EmptyState
      icon={Users}
      title="لا توجد جهات"
      description="أضف الجهات المسؤولة عن تقديم البيانات"
      actionLabel="إضافة جهة"
      actionHref="/dashboard/templates/entities/new"
    />
  );
}

export function NoDrafts() {
  return (
    <EmptyState
      icon={BarChart3}
      title="لا توجد مسودات"
      description="ابدأ بتوليد المحتوى باستخدام الذكاء الاصطناعي"
      actionLabel="بدء التوليد"
      actionHref="/dashboard/generate"
    />
  );
}
