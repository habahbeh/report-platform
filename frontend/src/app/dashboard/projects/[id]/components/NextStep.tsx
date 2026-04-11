import { ArrowLeft, Info, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Props {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  type?: 'info' | 'success' | 'warning';
}

export function NextStep({ message, actionLabel, onAction, href, type = 'info' }: Props) {
  const styles = {
    info:    { wrap: 'bg-blue-50 border-blue-100',    text: 'text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700 text-white',    Icon: Info },
    success: { wrap: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white', Icon: CheckCircle },
    warning: { wrap: 'bg-amber-50 border-amber-100',   text: 'text-amber-700',   btn: 'bg-amber-600 hover:bg-amber-700 text-white',   Icon: AlertCircle },
  }[type];

  const Icon = styles.Icon;

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border mt-4 ${styles.wrap}`}>
      <div className={`flex items-center gap-2 ${styles.text}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {actionLabel && (
        href
          ? <Link href={href} className={`flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg ${styles.btn}`}>
              {actionLabel} <ArrowLeft className="w-3 h-3" />
            </Link>
          : <button onClick={onAction} className={`flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg ${styles.btn}`}>
              {actionLabel} <ArrowLeft className="w-3 h-3" />
            </button>
      )}
    </div>
  );
}
