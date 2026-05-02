import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Table, Columns, Filter, Edit2, Trash2, ExternalLink, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import type { Paper, Author, Venue, PaperStatus, PaperType } from '../types';
import { STATUS_LABEL, TYPE_LABEL } from '../types';
import { papersApi, authorsApi, venuesApi, formatDate, daysUntil, deadlineClass } from '../utils/api';
import { StatusBadge, TypeBadge } from '../components/StatusBadge';
import PaperModal from '../components/PaperModal';
import KanbanBoard from '../components/KanbanBoard';

type SortKey = 'title' | 'status' | 'type' | 'updated_at' | 'submission_deadline';
type SortDir = 'asc' | 'desc';

export default function Papers() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [showModal, setShowModal] = useState(false);
  const [editPaper, setEditPaper] = useState<Paper | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterVenue, setFilterVenue] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([papersApi.list(), authorsApi.list(), venuesApi.list()])
      .then(([p, a, v]) => { setPapers(p); setAuthors(a); setVenues(v); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function handleDelete(id: number, title: string) {
    if (!confirm(`Xóa bài báo "${title}"?`)) return;
    papersApi.delete(id).then(load);
  }

  const filtered = papers.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterType && p.type !== filterType) return false;
    if (filterVenue && p.venue_id !== parseInt(filterVenue)) return false;
    if (filterAuthor && !p.authors.some(a => a.id === parseInt(filterAuthor))) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !(p.abstract?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortKey] as string ?? '';
    let bv = b[sortKey] as string ?? '';
    if (sortKey === 'submission_deadline') { av = a.submission_deadline || a.revision_deadline || ''; bv = b.submission_deadline || b.revision_deadline || ''; }
    const cmp = av.localeCompare(bv);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Tìm kiếm bài báo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="input w-auto text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {(Object.entries(STATUS_LABEL) as [PaperStatus, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input w-auto text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tất cả loại</option>
            {(Object.entries(TYPE_LABEL) as [PaperType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input w-auto text-sm" value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)}>
            <option value="">Tất cả tác giả</option>
            {authors.filter(a => a.is_member).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="input w-auto text-sm" value={filterVenue} onChange={e => setFilterVenue(e.target.value)}>
            <option value="">Tất cả venue</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.abbreviation || v.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            <button onClick={() => setView('table')} className={`px-3 py-1.5 text-sm transition-colors ${view === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Table size={15} />
            </button>
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-sm transition-colors ${view === 'kanban' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Columns size={15} />
            </button>
          </div>
          <button onClick={() => { setEditPaper(null); setShowModal(true); }} className="btn-primary">
            <Plus size={16} /> Thêm bài báo
          </button>
        </div>
      </div>

      {/* Stats summary bar */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Filter size={13} />
        <span><strong className="text-slate-900">{filtered.length}</strong> / {papers.length} bài báo</span>
        {(filterStatus || filterType || filterAuthor || filterVenue || search) && (
          <button onClick={() => { setFilterStatus(''); setFilterType(''); setFilterAuthor(''); setFilterVenue(''); setSearch(''); }}
            className="text-indigo-600 hover:underline text-xs">Xóa bộ lọc</button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : view === 'kanban' ? (
        <KanbanBoard papers={sorted} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th cursor-pointer hover:text-slate-700" onClick={() => handleSort('title')}>
                    <span className="flex items-center gap-1">Tiêu đề <SortIcon k="title" /></span>
                  </th>
                  <th className="table-th">Venue</th>
                  <th className="table-th">Tác giả</th>
                  <th className="table-th cursor-pointer hover:text-slate-700" onClick={() => handleSort('type')}>
                    <span className="flex items-center gap-1">Loại <SortIcon k="type" /></span>
                  </th>
                  <th className="table-th cursor-pointer hover:text-slate-700" onClick={() => handleSort('status')}>
                    <span className="flex items-center gap-1">Trạng thái <SortIcon k="status" /></span>
                  </th>
                  <th className="table-th cursor-pointer hover:text-slate-700" onClick={() => handleSort('submission_deadline')}>
                    <span className="flex items-center gap-1">Deadline <SortIcon k="submission_deadline" /></span>
                  </th>
                  <th className="table-th cursor-pointer hover:text-slate-700" onClick={() => handleSort('updated_at')}>
                    <span className="flex items-center gap-1">Cập nhật <SortIcon k="updated_at" /></span>
                  </th>
                  <th className="table-th">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Không tìm thấy bài báo nào</td></tr>
                )}
                {sorted.map((p, i) => {
                  const deadline = p.revision_deadline || p.submission_deadline;
                  const days = daysUntil(deadline);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-td text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="table-td max-w-xs">
                        <button
                          onClick={() => navigate(`/papers/${p.id}`)}
                          className="text-left font-medium text-slate-900 hover:text-indigo-600 line-clamp-2 leading-snug"
                        >
                          {p.title}
                        </button>
                        {(p.doi || p.arxiv_url || p.paper_url) && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-indigo-400 mt-0.5">
                            <ExternalLink size={10} />
                            {p.doi ? 'DOI' : p.arxiv_url ? 'ArXiv' : 'Link'}
                          </span>
                        )}
                      </td>
                      <td className="table-td">
                        {p.venue ? (
                          <div>
                            <span className="font-medium text-slate-800">{p.venue.abbreviation || p.venue.name}</span>
                            {p.venue.ranking && <span className="ml-1 text-xs text-indigo-500 font-medium">{p.venue.ranking}</span>}
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-0.5">
                          {p.authors.slice(0, 3).map(a => (
                            <span key={a.id} className={`text-xs px-1.5 py-0.5 rounded ${a.role === 'first' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600'}`}>
                              {a.name.split(' ').pop()}
                            </span>
                          ))}
                          {p.authors.length > 3 && <span className="text-xs text-slate-400">+{p.authors.length - 3}</span>}
                        </div>
                      </td>
                      <td className="table-td"><TypeBadge type={p.type} /></td>
                      <td className="table-td"><StatusBadge status={p.status} /></td>
                      <td className="table-td">
                        {deadline ? (
                          <div className={`flex items-center gap-1 text-xs ${deadlineClass(days)}`}>
                            <Calendar size={11} />
                            <span>{formatDate(deadline)}</span>
                            {days !== null && <span className="font-medium">({days < 0 ? 'quá hạn' : `${days}d`})</span>}
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="table-td text-xs text-slate-400">{formatDate(p.updated_at)}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditPaper(p); setShowModal(true); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.title)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <PaperModal
          paper={editPaper}
          authors={authors}
          venues={venues}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
