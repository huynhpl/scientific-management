import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, Search } from 'lucide-react';
import type { Paper, Author, Venue, PaperStatus, PaperType, AuthorRole } from '../types';
import { TYPE_LABEL, ROLE_LABEL } from '../types';
import { papersApi } from '../utils/api';

const STATUSES: { value: PaperStatus; label: string }[] = [
  { value: 'draft', label: 'Bản thảo' },
  { value: 'submitted', label: 'Đã nộp' },
  { value: 'under_review', label: 'Đang phản biện' },
  { value: 'major_revision', label: 'Sửa lớn' },
  { value: 'minor_revision', label: 'Sửa nhỏ' },
  { value: 'accepted', label: 'Chấp nhận' },
  { value: 'rejected', label: 'Từ chối' },
  { value: 'published', label: 'Đã xuất bản' },
  { value: 'withdrawn', label: 'Rút bài' },
];

interface AuthorEntry { id: number; name: string; role: AuthorRole; order_index: number }

interface Props {
  paper?: Paper | null;
  authors: Author[];
  venues: Venue[];
  onClose: () => void;
  onSaved: () => void;
}

export default function PaperModal({ paper, authors, venues, onClose, onSaved }: Props) {
  const isEdit = !!paper;
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [venueOpen, setVenueOpen] = useState(false);
  const venueRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    title: '', abstract: '', type: 'conference' as PaperType, venue_id: '',
    status: 'draft' as PaperStatus, notes: '',
    submission_deadline: '', revision_deadline: '',
    submission_date: '', decision_date: '', publication_date: '',
    doi: '', arxiv_url: '', paper_url: '', openreview_url: '',
  });
  const [paperAuthors, setPaperAuthors] = useState<AuthorEntry[]>([]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (venueRef.current && !venueRef.current.contains(e.target as Node)) setVenueOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (paper) {
      setForm({
        title: paper.title || '',
        abstract: paper.abstract || '',
        type: paper.type || 'conference',
        venue_id: paper.venue_id ? String(paper.venue_id) : '',
        status: paper.status || 'draft',
        notes: paper.notes || '',
        submission_deadline: paper.submission_deadline || '',
        revision_deadline: paper.revision_deadline || '',
        submission_date: paper.submission_date || '',
        decision_date: paper.decision_date || '',
        publication_date: paper.publication_date || '',
        doi: paper.doi || '',
        arxiv_url: paper.arxiv_url || '',
        paper_url: paper.paper_url || '',
        openreview_url: paper.openreview_url || '',
      });
      setPaperAuthors(paper.authors?.map(a => ({ id: a.id, name: a.name, role: a.role, order_index: a.order_index })) || []);
    }
  }, [paper]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const selectedVenue = venues.find(v => String(v.id) === form.venue_id);
  const venueLabel = (v: Venue) => v.abbreviation ? `[${v.abbreviation}] ${v.name}` : v.name;
  const filteredVenues = venueSearch.trim()
    ? venues.filter(v => {
        const q = venueSearch.toLowerCase();
        return v.abbreviation?.toLowerCase().includes(q) || v.name.toLowerCase().includes(q);
      })
    : venues;
  const venueConferences = filteredVenues.filter(v => v.type === 'conference');
  const venueJournals = filteredVenues.filter(v => v.type === 'journal');

  function selectVenue(id: string) {
    setForm(f => ({ ...f, venue_id: id }));
    setVenueSearch('');
    setVenueOpen(false);
  }

  function addAuthor() {
    const available = authors.filter(a => !paperAuthors.find(pa => pa.id === a.id));
    if (available.length === 0) return;
    const a = available[0];
    setPaperAuthors(prev => [...prev, { id: a.id, name: a.name, role: 'co-author', order_index: prev.length }]);
  }

  function removeAuthor(id: number) {
    setPaperAuthors(prev => prev.filter(a => a.id !== id).map((a, i) => ({ ...a, order_index: i })));
  }

  function changeAuthorRole(id: number, role: AuthorRole) {
    setPaperAuthors(prev => prev.map(a => a.id === id ? { ...a, role } : a));
  }

  function changeAuthorPerson(oldId: number, newId: string) {
    const newAuthor = authors.find(a => a.id === parseInt(newId));
    if (!newAuthor) return;
    setPaperAuthors(prev => prev.map(a => a.id === oldId ? { ...a, id: newAuthor.id, name: newAuthor.name } : a));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Tiêu đề không được để trống'); setTab(0); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        venue_id: form.venue_id ? parseInt(form.venue_id) : undefined,
        authors: paperAuthors.map((a, i) => ({ id: a.id, role: a.role, order_index: i })),
      };
      if (isEdit) {
        await papersApi.update(paper!.id, payload);
      } else {
        await papersApi.create(payload);
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  }

  const tabs = ['Thông tin cơ bản', 'Tác giả', 'Thời gian', 'Liên kết & Ghi chú'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? 'Chỉnh sửa bài báo' : 'Thêm bài báo mới'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === i ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

            {/* Tab 0: Basic Info */}
            {tab === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="label">Tiêu đề bài báo *</label>
                  <input className="input" value={form.title} onChange={set('title')} placeholder="Nhập tiêu đề bài báo..." required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Loại</label>
                    <select className="input" value={form.type} onChange={set('type')}>
                      {(Object.entries(TYPE_LABEL) as [PaperType, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Trạng thái</label>
                    <select className="input" value={form.status} onChange={set('status')}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Tạp chí / Hội nghị</label>
                  <div ref={venueRef} className="relative">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        className="input pl-8 pr-8"
                        placeholder={selectedVenue ? venueLabel(selectedVenue) : 'Tìm theo kí hiệu hoặc tên...'}
                        value={venueOpen ? venueSearch : (selectedVenue ? venueLabel(selectedVenue) : '')}
                        onFocus={() => { setVenueOpen(true); setVenueSearch(''); }}
                        onChange={e => setVenueSearch(e.target.value)}
                      />
                      {form.venue_id && !venueOpen && (
                        <button type="button" onClick={() => selectVenue('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {venueOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        <div
                          className="px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 cursor-pointer"
                          onMouseDown={() => selectVenue('')}
                        >
                          -- Chưa chọn --
                        </div>
                        {venueConferences.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 sticky top-0">Hội nghị</div>
                            {venueConferences.map(v => (
                              <div key={v.id}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 ${form.venue_id === String(v.id) ? 'bg-indigo-50 text-indigo-700 font-medium' : ''}`}
                                onMouseDown={() => selectVenue(String(v.id))}
                              >
                                {v.abbreviation && <span className="font-mono font-semibold mr-2">{v.abbreviation}</span>}
                                <span className="text-slate-600">{v.name}</span>
                              </div>
                            ))}
                          </>
                        )}
                        {venueJournals.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 sticky top-0">Tạp chí</div>
                            {venueJournals.map(v => (
                              <div key={v.id}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 ${form.venue_id === String(v.id) ? 'bg-indigo-50 text-indigo-700 font-medium' : ''}`}
                                onMouseDown={() => selectVenue(String(v.id))}
                              >
                                {v.abbreviation && <span className="font-mono font-semibold mr-2">{v.abbreviation}</span>}
                                <span className="text-slate-600">{v.name}</span>
                              </div>
                            ))}
                          </>
                        )}
                        {venueConferences.length === 0 && venueJournals.length === 0 && (
                          <div className="px-3 py-4 text-sm text-slate-400 text-center">Không tìm thấy kết quả</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">Tóm tắt</label>
                  <textarea className="input h-28 resize-none" value={form.abstract} onChange={set('abstract')} placeholder="Nhập tóm tắt nội dung..." />
                </div>
              </div>
            )}

            {/* Tab 1: Authors */}
            {tab === 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">Kéo thả để sắp xếp thứ tự tác giả</p>
                  <button type="button" onClick={addAuthor} className="btn-primary text-xs">
                    <Plus size={14} /> Thêm tác giả
                  </button>
                </div>
                {paperAuthors.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">Chưa có tác giả nào. Nhấn "Thêm tác giả" để bắt đầu.</p>
                )}
                {paperAuthors.map((a, idx) => (
                  <div key={a.id + '-' + idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <GripVertical size={16} className="text-slate-400 flex-shrink-0" />
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-semibold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <select
                      className="input flex-1"
                      value={a.id}
                      onChange={e => changeAuthorPerson(a.id, e.target.value)}
                    >
                      {authors.map(au => (
                        <option key={au.id} value={au.id} disabled={paperAuthors.some(pa => pa.id === au.id && pa.id !== a.id)}>
                          {au.name}{!au.is_member ? ' (Cộng tác)' : ''}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input w-44"
                      value={a.role}
                      onChange={e => changeAuthorRole(a.id, e.target.value as AuthorRole)}
                    >
                      {(Object.entries(ROLE_LABEL) as [AuthorRole, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeAuthor(a.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Timeline */}
            {tab === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Deadline nộp bài</label>
                    <input type="date" className="input" value={form.submission_deadline} onChange={set('submission_deadline')} />
                  </div>
                  <div>
                    <label className="label">Deadline chỉnh sửa</label>
                    <input type="date" className="input" value={form.revision_deadline} onChange={set('revision_deadline')} />
                  </div>
                  <div>
                    <label className="label">Ngày nộp bài</label>
                    <input type="date" className="input" value={form.submission_date} onChange={set('submission_date')} />
                  </div>
                  <div>
                    <label className="label">Ngày nhận kết quả</label>
                    <input type="date" className="input" value={form.decision_date} onChange={set('decision_date')} />
                  </div>
                  <div>
                    <label className="label">Ngày xuất bản</label>
                    <input type="date" className="input" value={form.publication_date} onChange={set('publication_date')} />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Links & Notes */}
            {tab === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="label">DOI</label>
                  <input className="input" value={form.doi} onChange={set('doi')} placeholder="10.xxxx/xxxxx" />
                </div>
                <div>
                  <label className="label">ArXiv URL</label>
                  <input className="input" value={form.arxiv_url} onChange={set('arxiv_url')} placeholder="https://arxiv.org/abs/xxxx.xxxxx" />
                </div>
                <div>
                  <label className="label">Paper URL</label>
                  <input className="input" value={form.paper_url} onChange={set('paper_url')} placeholder="https://..." />
                </div>
                <div>
                  <label className="label">OpenReview URL</label>
                  <input className="input" value={form.openreview_url} onChange={set('openreview_url')} placeholder="https://openreview.net/forum?id=..." />
                </div>
                <div>
                  <label className="label">Ghi chú</label>
                  <textarea className="input h-24 resize-none" value={form.notes} onChange={set('notes')} placeholder="Ghi chú nội bộ..." />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-2xl">
            <div className="flex gap-1">
              {tabs.map((_, i) => (
                <button key={i} type="button" onClick={() => setTab(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === tab ? 'bg-indigo-600' : 'bg-slate-300'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
              {tab < tabs.length - 1 && (
                <button type="button" onClick={() => setTab(t => t + 1)} className="btn-secondary">Tiếp →</button>
              )}
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo bài báo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
