import Link from 'next/link';
import { Users, Send, Bell, Copy, ExternalLink } from 'lucide-react';
import { Project, contributorStatusLabels, contributorStatusColors } from './types';
import { NextStep } from './NextStep';

interface Props {
  project: Project;
  actionLoading: boolean;
  handleInviteAll: () => void;
  handleRemindAll: () => void;
  copyInviteLink: (token: string) => void;
}

export function ContributorsTab({ project, actionLoading, handleInviteAll, handleRemindAll, copyInviteLink }: Props) {
  const completedCount = project.contributors.filter(c => c.progress === 100).length;
  const totalCount = project.contributors.length;
  const allDone = completedCount === totalCount && totalCount > 0;

  if (totalCount === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-indigo-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">لا يوجد مساهمون بعد</h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
          أضف الجهات المسؤولة عن إدخال البيانات وأرسل لهم روابط المشاركة
        </p>
        <button onClick={handleInviteAll} disabled={actionLoading} className="btn btn-primary">
          <Send className="w-4 h-4" />
          إرسال الدعوات
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">المساهمون ({totalCount})</h3>
          <p className="text-sm text-gray-500 mt-0.5">{completedCount} من {totalCount} أكمل البيانات</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleInviteAll} disabled={actionLoading} className="btn btn-secondary text-sm flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            دعوات
          </button>
          <button onClick={handleRemindAll} disabled={actionLoading} className="btn btn-secondary text-sm flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            تذكير
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-right">
              <th className="pb-3 font-medium text-gray-500">الجهة</th>
              <th className="pb-3 font-medium text-gray-500">المسؤول</th>
              <th className="pb-3 font-medium text-gray-500">الحالة</th>
              <th className="pb-3 font-medium text-gray-500">التقدم</th>
              <th className="pb-3 font-medium text-gray-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {project.contributors.map((contributor) => (
              <tr key={contributor.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="py-3">
                  <div className="font-medium">{contributor.entity_name}</div>
                  <div className="text-gray-500 text-xs">{contributor.items_count} بند</div>
                </td>
                <td className="py-3">
                  <div>{contributor.name || '-'}</div>
                  <div className="text-gray-500 text-xs">{contributor.email || '-'}</div>
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${contributorStatusColors[contributor.status]}`}>
                    {contributorStatusLabels[contributor.status]}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${contributor.progress}%` }}
                      />
                    </div>
                    <span className="text-gray-600 text-xs">{contributor.completed_items_count}/{contributor.items_count}</span>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyInviteLink(contributor.invite_token)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      نسخ الرابط
                    </button>
                    <Link
                      href={`/contribute/${contributor.invite_token}`}
                      target="_blank"
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      فتح
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allDone ? (
        <NextStep
          message={`جميع المساهمين (${totalCount}) أكملوا إدخال البيانات — يمكنك الانتقال للمراجعة`}
          actionLabel="انتقل للمراجعة"
          type="success"
        />
      ) : (
        <NextStep
          message={`${totalCount - completedCount} جهة لم تكمل بعد — يمكنك إرسال تذكيرات`}
          actionLabel="إرسال تذكيرات"
          onAction={handleRemindAll}
          type="warning"
        />
      )}
    </div>
  );
}
