import { useNavigate } from 'react-router-dom';
import type { Paper, PaperStatus } from '../types';
import { StatusBadge, TypeBadge } from './StatusBadge';
import { formatDate, daysUntil, deadlineClass } from '../utils/api';
import { Calendar, ExternalLink } from 'lucide-react';

const COLUMNS: { statuses: PaperStatus[]; label: string; color: string }[] = [
  { statuses: ['draft'], label: 'Bản thảo', color: 'bg-slate-200' },
  { statuses: ['submitted'], label: 'Đã nộp', color: 'bg-blue-200' },
  { statuses: ['under_review'], label: 'Đang phản biện', color: 'bg-amber-200' },
  { statuses: ['major_revision', 'minor_revision'], label: 'Cần chỉnh sửa', color: 'bg-orange-200' },
  { statuses: ['accepted', 'published'], label: 'Chấp nhận / Xuất bản', color: 'bg-green-200' },
  { statuses: ['rejected', 'withdrawn'], label: 'Từ chối / Rút', color: 'bg-red-200' },
];

function PaperCard({ paper }: { paper: Paper }) {
  const navigate = useNavigate();
  const deadline = paper.revision_deadline || paper.submission_deadline;
  const days = daysUntil(deadline);

  return (
    <div
      onClick={() => navigate(`/papers/${paper.id}`)}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all"
    >
      <p className="text-sm font-medium text-slate-900 leading-snug line-clamp-2 mb-2">{paper.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        <StatusBadge status={paper.status} />
        <TypeBadge type={paper.type} />
      </div>
      {paper.venue && (
        <p className="text-xs text-slate-500 mb-1.5">
          {paper.venue.abbreviation || paper.venue.name}
          {paper.venue.ranking && <span className="ml-1 text-indigo-500 font-medium">{paper.venue.ranking}</span>}
        </p>
      )}
      {paper.authors.length > 0 && (
        <p className="text-xs text-slate-500 truncate">
          {paper.authors.map(a => a.name.split(' ').pop()).join(', ')}
        </p>
      )}
      {deadline && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${deadlineClass(days)}`}>
          <Calendar size={11} />
          {days !== null && days < 0 ? 'Quá hạn' : days !== null && days === 0 ? 'Hôm nay!' : `${days} ngày`}
          <span className="text-slate-400">· {formatDate(deadline)}</span>
        </div>
      )}
      {(paper.doi || paper.arxiv_url || paper.paper_url) && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-indigo-500">
          <ExternalLink size={10} />
          {paper.doi ? 'DOI' : paper.arxiv_url ? 'ArXiv' : 'Link'}
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ papers }: { papers: Paper[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll">
      {COLUMNS.map(col => {
        const colPapers = papers.filter(p => col.statuses.includes(p.status));
        return (
          <div key={col.label} className="flex-shrink-0 w-64">
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.color}`}>
              <span className="text-xs font-semibold text-slate-700">{col.label}</span>
              <span className="text-xs font-bold text-slate-600 bg-white/60 rounded-full w-5 h-5 flex items-center justify-center">
                {colPapers.length}
              </span>
            </div>
            <div className="bg-slate-100 rounded-b-lg p-2 min-h-32 space-y-2">
              {colPapers.map(p => <PaperCard key={p.id} paper={p} />)}
              {colPapers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Không có bài báo</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
