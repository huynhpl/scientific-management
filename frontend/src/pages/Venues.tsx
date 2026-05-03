import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Building2, Calendar, MapPin, Link, Loader2, Sparkles } from 'lucide-react';
import type { Venue } from '../types';
import { venuesApi, formatDate, daysUntil, deadlineClass } from '../utils/api';

interface VenueForm {
  name: string; abbreviation: string; type: 'journal' | 'conference';
  url: string; impact_factor: string; sjr_score: string; ranking: string;
  deadline: string; location: string;
}

const EMPTY = (type: 'journal' | 'conference'): VenueForm => ({
  name: '', abbreviation: '', type, url: '', impact_factor: '', sjr_score: '', ranking: '', deadline: '', location: '',
});

const CONF_RANKINGS = ['A*', 'A', 'B', 'C'];
const JOUR_RANKINGS = ['Q1', 'Q2', 'Q3', 'Q4'];

function Modal({ venue, defaultType, onClose, onSaved }: { venue?: Venue | null; defaultType: 'journal' | 'conference'; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<VenueForm>(
    venue
      ? { name: venue.name, abbreviation: venue.abbreviation || '', type: venue.type, url: venue.url || '', impact_factor: venue.impact_factor ? String(venue.impact_factor) : '', sjr_score: venue.sjr_score ? String(venue.sjr_score) : '', ranking: venue.ranking || '', deadline: venue.deadline || '', location: venue.location || '' }
      : EMPTY(defaultType)
  );
  const [saving, setSaving] = useState(false);
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');

  const set = (k: keyof VenueForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleExtract() {
    if (!extractUrl.trim()) return;
    setExtracting(true);
    setExtractError('');
    try {
      const res = await fetch('/api/venues/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: extractUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể bóc thông tin');
      setForm(f => ({
        ...f,
        name: data.name || f.name,
        abbreviation: data.abbreviation || f.abbreviation,
        type: data.type || f.type,
        ranking: data.ranking || f.ranking,
        impact_factor: data.impact_factor != null ? String(data.impact_factor) : f.impact_factor,
        sjr_score: data.sjr_score != null ? String(data.sjr_score) : f.sjr_score,
        deadline: data.deadline || f.deadline,
        location: data.location || f.location,
        url: extractUrl.trim(),
      }));
    } catch (e: unknown) {
      setExtractError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      impact_factor: form.impact_factor ? parseFloat(form.impact_factor) : undefined,
      sjr_score: form.sjr_score ? parseFloat(form.sjr_score) : undefined,
    };
    try {
      if (venue) await venuesApi.update(venue.id, payload);
      else await venuesApi.create(payload);
      onSaved();
    } finally { setSaving(false); }
  }

  const isJournal = form.type === 'journal';
  const rankings = isJournal ? JOUR_RANKINGS : CONF_RANKINGS;
  const title = venue
    ? 'Chỉnh sửa venue'
    : isJournal ? 'Thêm tạp chí' : 'Thêm hội nghị';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick extract */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-2">
            <p className="text-xs font-medium text-indigo-700 flex items-center gap-1.5">
              <Sparkles size={12} /> Điền nhanh từ link
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-7 text-sm"
                  value={extractUrl}
                  onChange={e => setExtractUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleExtract())}
                  placeholder={isJournal ? 'Link trang tạp chí (Springer, Elsevier, IEEE...)' : 'Link hội nghị...'}
                />
              </div>
              <button type="button" onClick={handleExtract} disabled={extracting || !extractUrl.trim()}
                className="btn-primary text-sm px-3 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
                {extracting ? <><Loader2 size={13} className="animate-spin" /> Đang xử lý...</> : 'Tự động điền'}
              </button>
            </div>
            {extractError && <p className="text-xs text-red-600">{extractError}</p>}
          </div>

          <div>
            <label className="label">Tên đầy đủ *</label>
            <input className="input" value={form.name} onChange={set('name')} required
              placeholder={isJournal ? 'IEEE Transactions on Pattern Analysis...' : 'International Conference on Machine Learning'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tên viết tắt</label>
              <input className="input" value={form.abbreviation} onChange={set('abbreviation')}
                placeholder={isJournal ? 'TPAMI' : 'ICML'} />
            </div>
            <div>
              <label className="label">Loại</label>
              <select className="input" value={form.type} onChange={set('type')}>
                <option value="conference">Hội nghị</option>
                <option value="journal">Tạp chí</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">URL</label>
            <input className="input" type="url" value={form.url} onChange={set('url')} placeholder="https://..." />
          </div>

          {/* Journal-specific fields */}
          {isJournal && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Impact Factor (JCR)</label>
                <input className="input" type="number" step="0.001" min="0" value={form.impact_factor} onChange={set('impact_factor')} placeholder="14.255" />
              </div>
              <div>
                <label className="label">SJR Score</label>
                <input className="input" type="number" step="0.001" min="0" value={form.sjr_score} onChange={set('sjr_score')} placeholder="5.123" />
              </div>
            </div>
          )}

          <div>
            <label className="label">Xếp hạng</label>
            <select className="input" value={form.ranking} onChange={set('ranking')}>
              <option value="">Chưa xếp hạng</option>
              {rankings.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Conference-specific fields */}
          {!isJournal && (
            <>
              <div>
                <label className="label">Deadline nộp bài</label>
                <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
              </div>
              <div>
                <label className="label">Địa điểm tổ chức</label>
                <input className="input" value={form.location} onChange={set('location')} placeholder="VD: Vienna, Austria" />
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Lưu...' : venue ? 'Lưu' : 'Thêm'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RankBadge({ ranking }: { ranking?: string }) {
  if (!ranking) return null;
  const colors: Record<string, string> = {
    'A*': 'bg-purple-100 text-purple-700', 'A': 'bg-indigo-100 text-indigo-700',
    'B': 'bg-blue-100 text-blue-700', 'C': 'bg-slate-100 text-slate-600',
    'Q1': 'bg-green-100 text-green-700', 'Q2': 'bg-lime-100 text-lime-700',
    'Q3': 'bg-yellow-100 text-yellow-700', 'Q4': 'bg-orange-100 text-orange-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${colors[ranking] || 'bg-gray-100 text-gray-600'}`}>{ranking}</span>;
}

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [defaultType, setDefaultType] = useState<'journal' | 'conference'>('conference');

  function load() { venuesApi.list().then(setVenues).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, []);

  function openAdd(type: 'journal' | 'conference') {
    setEditVenue(null);
    setDefaultType(type);
    setShowModal(true);
  }

  function handleDelete(v: Venue) {
    if (!confirm(`Xóa "${v.name}"?`)) return;
    venuesApi.delete(v.id).then(load);
  }

  const conferences = venues.filter(v => v.type === 'conference');
  const journals = venues.filter(v => v.type === 'journal');

  function ConferenceTable({ list }: { list: Venue[] }) {
    if (list.length === 0) return <p className="text-slate-400 text-sm text-center py-6">Chưa có hội nghị nào</p>;
    return (
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th">Tên đầy đủ</th>
              <th className="table-th">Viết tắt</th>
              <th className="table-th">Xếp hạng</th>
              <th className="table-th">Deadline</th>
              <th className="table-th">Địa điểm</th>
              <th className="table-th">URL</th>
              <th className="table-th">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map(v => {
              const days = daysUntil(v.deadline);
              return (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium text-slate-900">{v.name}</td>
                  <td className="table-td"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v.abbreviation || '—'}</span></td>
                  <td className="table-td"><RankBadge ranking={v.ranking} /></td>
                  <td className="table-td">
                    {v.deadline ? (
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                        <span className={`text-xs ${deadlineClass(days)}`}>{formatDate(v.deadline)}</span>
                        {days !== null && days >= 0 && <span className="text-xs text-slate-400">({days}d)</span>}
                        {days !== null && days < 0 && <span className="text-xs text-red-400">(đã qua)</span>}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="table-td">
                    {v.location ? <div className="flex items-center gap-1 text-xs text-slate-600"><MapPin size={11} className="text-slate-400 flex-shrink-0" />{v.location}</div> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="table-td">
                    {v.url ? <a href={v.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1 text-xs"><ExternalLink size={11} /> Link</a> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditVenue(v); setDefaultType(v.type); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(v)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function JournalTable({ list }: { list: Venue[] }) {
    if (list.length === 0) return <p className="text-slate-400 text-sm text-center py-6">Chưa có tạp chí nào</p>;
    return (
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th">Tên đầy đủ</th>
              <th className="table-th">Viết tắt</th>
              <th className="table-th">Xếp hạng</th>
              <th className="table-th">IF (JCR)</th>
              <th className="table-th">SJR</th>
              <th className="table-th">URL</th>
              <th className="table-th">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map(v => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="table-td font-medium text-slate-900">{v.name}</td>
                <td className="table-td"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v.abbreviation || '—'}</span></td>
                <td className="table-td"><RankBadge ranking={v.ranking} /></td>
                <td className="table-td">{v.impact_factor ? <span className="text-green-700 font-medium">{Number(v.impact_factor).toFixed(3)}</span> : <span className="text-slate-400">—</span>}</td>
                <td className="table-td">{v.sjr_score ? <span className="text-blue-700 font-medium">{Number(v.sjr_score).toFixed(3)}</span> : <span className="text-slate-400">—</span>}</td>
                <td className="table-td">
                  {v.url ? <a href={v.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1 text-xs"><ExternalLink size={11} /> Link</a> : <span className="text-slate-400">—</span>}
                </td>
                <td className="table-td">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditVenue(v); setDefaultType(v.type); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(v)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Building2 size={16} />
          <span><strong className="text-slate-900">{conferences.length}</strong> hội nghị, <strong className="text-slate-900">{journals.length}</strong> tạp chí</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openAdd('conference')} className="btn-secondary">
            <Plus size={16} /> Thêm hội nghị
          </button>
          <button onClick={() => openAdd('journal')} className="btn-primary">
            <Plus size={16} /> Thêm tạp chí
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : (
        <>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Hội nghị ({conferences.length})</h3>
            <ConferenceTable list={conferences} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Tạp chí ({journals.length})</h3>
            <JournalTable list={journals} />
          </div>
        </>
      )}

      {showModal && (
        <Modal
          venue={editVenue}
          defaultType={defaultType}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
