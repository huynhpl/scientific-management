import { STATUS_LABEL, STATUS_COLOR, TYPE_LABEL } from '../types';
import type { PaperStatus, PaperType } from '../types';

export function StatusBadge({ status }: { status: PaperStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function TypeBadge({ type }: { type: PaperType }) {
  const colors: Record<PaperType, string> = {
    journal: 'bg-violet-100 text-violet-700',
    conference: 'bg-cyan-100 text-cyan-700',
    workshop: 'bg-teal-100 text-teal-700',
    preprint: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
      {TYPE_LABEL[type]}
    </span>
  );
}
