import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Pencil, Trash2, ExternalLink,
  ChevronLeft, ChevronRight, X, Upload, Wand2,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { journalCatalogApi } from '../utils/api';
import type { JournalCatalog, JournalListType } from '../types';
import { JOURNAL_LIST_TYPE_LABEL, JOURNAL_LIST_TYPE_COLOR, QUARTILE_COLOR } from '../types';
import { useAuth } from '../contexts/AuthContext';

const LIST_TYPES: { value: JournalListType | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'quoc_gia', label: 'Quốc gia' },
  { value: 'isi', label: 'ISI' },
  { value: 'quoc_te', label: 'Quốc tế' },
  { value: 'draft_quoc_te', label: 'Quốc tế (Draft)' },
];

const QUARTILES = ['', 'Q1', 'Q2', 'Q3', 'Q4'];

type SortBy = 'name' | 'quartile' | 'jcr_score' | 'h_index' | 'points';
type SortDir = 'asc' | 'desc';

interface FormState {
  name: string;
  issn: string;
  eissn: string;
  list_type: JournalListType;
  type: string;
  organization: string;
  points: string;
  field: string;
  url: string;
  quartile: string;
  sjr_score: string;
  jcr_score: string;
  h_index: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  name: '', issn: '', eissn: '', list_type: 'quoc_te', type: '', organization: '',
  points: '', field: '', url: '', quartile: '', sjr_score: '', jcr_score: '', h_index: '', notes: '',
});

function SortIcon({ col, sortBy, sortDir }: { col: SortBy; sortBy: SortBy; sortDir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown size={12} className="text-slate-300 ml-0.5" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-indigo-500 ml-0.5" />
    : <ChevronDown size={12} className="text-indigo-500 ml-0.5" />;
}

export default function JournalCatalog() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState<JournalCatalog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deduping, setDeduping] = useState(false);

  const [search, setSearch] = useState('');
  const [listType, setListType] = useState<JournalListType | ''>('');
  const [quartile, setQuartile] = useState('');
  const [field, setField] = useState('');
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const LIMIT = 50;

  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [editTarget, setEditTarget] = useState<JournalCatalog | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<JournalCatalog | null>(null);
  const [detailTarget, setDetailTarget] = useState<JournalCatalog | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page), limit: String(LIMIT),
        sort_by: sortBy, sort_dir: sortDir,
      };
      if (search) params.search = search;
      if (listType) params.list_type = listType;
      if (quartile) params.quartile = quartile;
      if (field) params.field = field;
      const res = await journalCatalogApi.list(params);
      setData(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, listType, quartile, field, page, sortBy, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, listType, quartile, field, sortBy, sortDir]);

  // Load field options (refresh when list_type changes)
  useEffect(() => {
    journalCatalogApi.fields(listType || undefined).then(setFieldOptions).catch(() => {});
  }, [listType]);

  const handleSort = (col: SortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      // Default: IF, H-index descending (higher = better); name ascending
      setSortDir(col === 'name' || col === 'points' ? 'asc' : 'desc');
    }
  };

  const openCreate = () => { setForm(emptyForm()); setFormError(''); setModal('create'); };
  const openEdit = (j: JournalCatalog) => {
    setEditTarget(j);
    setForm({
      name: j.name, issn: j.issn || '', eissn: j.eissn || '',
      list_type: j.list_type, type: j.type || '', organization: j.organization || '',
      points: j.points || '', field: j.field || '', url: j.url || '',
      quartile: j.quartile || '', sjr_score: j.sjr_score || '', jcr_score: j.jcr_score || '',
      h_index: j.h_index != null ? String(j.h_index) : '', notes: j.notes || '',
    });
    setFormError('');
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Tên tạp chí là bắt buộc'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, h_index: form.h_index ? parseInt(form.h_index) : null };
      if (modal === 'create') {
        await journalCatalogApi.create(payload);
      } else if (modal === 'edit' && editTarget) {
        await journalCatalogApi.update(editTarget.id, payload);
      }
      setModal(null);
      fetchData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Lỗi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await journalCatalogApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = async () => {
    if (!confirm('Import sẽ xóa toàn bộ dữ liệu hiện tại và nhập lại từ Publications.xlsx (tự động làm sạch trùng lặp). Tiếp tục?')) return;
    setImporting(true);
    try {
      const res = await journalCatalogApi.import();
      alert(`Import thành công!\nNhập: ${res.inserted.toLocaleString()} bản ghi\nSau làm sạch: ${res.after_dedup?.toLocaleString() ?? '?'} bản ghi\nXóa trùng: ${res.deleted_duplicates?.toLocaleString() ?? '?'} bản ghi`);
      setPage(1);
      fetchData();
    } catch (e: unknown) {
      alert('Lỗi import: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setImporting(false);
    }
  };

  const handleDedup = async () => {
    if (!confirm('Chạy làm sạch dữ liệu trùng lặp (lấy ISSN làm gốc, tổng hợp thông tin từ các danh mục). Tiếp tục?')) return;
    setDeduping(true);
    try {
      const res = await journalCatalogApi.dedup();
      alert(`Làm sạch xong!\nCòn lại: ${res.remaining.toLocaleString()} bản ghi\nĐã xóa: ${res.deleted.toLocaleString()} bản ghi trùng`);
      setPage(1);
      fetchData();
    } catch (e: unknown) {
      alert('Lỗi: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDeduping(false);
    }
  };

  const thSort = (col: SortBy, label: string, extraCls = '') => (
    <th
      className={`px-4 py-3 text-left font-medium cursor-pointer select-none hover:bg-slate-100 transition-colors ${extraCls}`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <SortIcon col={col} sortBy={sortBy} sortDir={sortDir} />
      </span>
    </th>
  );

  const activeFilters = [search, listType, quartile, field].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Danh mục tạp chí / hội nghị HĐGSNN</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {total.toLocaleString()} bản ghi — được Hội đồng Giáo sư Nhà nước công nhận
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleDedup}
                disabled={deduping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <Wand2 size={15} />
                {deduping ? 'Đang làm sạch...' : 'Làm sạch trùng lặp'}
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <Upload size={15} />
                {importing ? 'Đang import...' : 'Import từ Excel'}
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus size={15} />
                Thêm mới
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Tìm theo tên, ISSN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Quartile filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 whitespace-nowrap">Quartile:</span>
            <select
              value={quartile}
              onChange={e => setQuartile(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {QUARTILES.map(q => (
                <option key={q} value={q}>{q || 'Tất cả'}</option>
              ))}
            </select>
          </div>

          {/* Field filter */}
          {fieldOptions.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 whitespace-nowrap">Ngành:</span>
              <select
                value={field}
                onChange={e => setField(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[200px]"
              >
                <option value="">Tất cả</option>
                {fieldOptions.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          )}

          {activeFilters > 0 && (
            <button
              onClick={() => { setSearch(''); setListType(''); setQuartile(''); setField(''); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={12} /> Xóa bộ lọc
            </button>
          )}
        </div>

        {/* List type tabs */}
        <div className="flex gap-1 flex-wrap">
          {LIST_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setListType(value as JournalListType | ''); setField(''); }}
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                listType === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium w-8">#</th>
                {thSort('name', 'Tên tạp chí / hội nghị')}
                <th className="px-4 py-3 text-left font-medium w-28">ISSN</th>
                <th className="px-4 py-3 text-left font-medium w-32">Danh mục</th>
                {thSort('quartile', 'Quartile', 'w-24')}
                {thSort('jcr_score', 'IF (JCR)', 'w-24')}
                {thSort('h_index', 'H-index', 'w-20')}
                {thSort('points', 'Điểm quy đổi', 'w-24')}
                <th className="px-4 py-3 text-left font-medium">Ngành</th>
                <th className="px-4 py-3 text-center font-medium w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">Đang tải...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">
                  {total === 0 && !search && !listType ? 'Chưa có dữ liệu. Admin hãy bấm "Import từ Excel" để nhập dữ liệu.' : 'Không tìm thấy kết quả.'}
                </td></tr>
              ) : (
                data.map((j, idx) => (
                  <tr key={j.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 text-slate-400 text-xs">{(page - 1) * LIMIT + idx + 1}</td>

                    {/* Name */}
                    <td className="px-4 py-3 max-w-xs">
                      <button
                        className="text-left text-slate-800 font-medium hover:text-indigo-600 line-clamp-2 leading-snug"
                        onClick={() => setDetailTarget(j)}
                      >
                        {j.name}
                      </button>
                      {j.organization && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate">{j.organization}</div>
                      )}
                    </td>

                    {/* ISSN */}
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      <div>{j.issn || '—'}</div>
                      {j.eissn && <div className="text-slate-400 text-[10px]">e: {j.eissn}</div>}
                    </td>

                    {/* Sources badges */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(j.sources || j.list_type).split(',').map(s => (
                          <span key={s} className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${JOURNAL_LIST_TYPE_COLOR[s as JournalListType] || 'bg-slate-100 text-slate-600'}`}>
                            {JOURNAL_LIST_TYPE_LABEL[s as JournalListType] || s}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Quartile */}
                    <td className="px-4 py-3">
                      {j.quartile ? (
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${QUARTILE_COLOR[j.quartile] || 'bg-slate-100 text-slate-600'}`}>
                          {j.quartile}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>

                    {/* IF (JCR) */}
                    <td className="px-4 py-3 text-xs">
                      {j.jcr_score
                        ? <span className="font-medium text-slate-700">{j.jcr_score}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>

                    {/* H-index */}
                    <td className="px-4 py-3 text-xs">
                      {j.h_index != null
                        ? <span className="font-medium text-slate-700">{j.h_index}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Điểm QG */}
                    <td className="px-4 py-3 text-xs">
                      {j.points
                        ? <span className="font-medium text-green-700">{j.points}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Ngành */}
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate" title={j.field || ''}>
                      {j.field || <span className="text-slate-300">—</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {j.url && (
                          <a href={j.url} target="_blank" rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {isAdmin && (
                          <>
                            <button onClick={() => openEdit(j)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-600">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteTarget(j)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500">
              Trang {page}/{pages} · {total.toLocaleString()} kết quả
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pages - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded text-xs font-medium ${p === page ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-slate-900 leading-snug">{detailTarget.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(detailTarget.sources || detailTarget.list_type).split(',').map(s => (
                    <span key={s} className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${JOURNAL_LIST_TYPE_COLOR[s as JournalListType] || 'bg-slate-100 text-slate-600'}`}>
                      {JOURNAL_LIST_TYPE_LABEL[s as JournalListType] || s}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => setDetailTarget(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-2.5 text-sm">
              {([
                ['Loại', detailTarget.type],
                ['ISSN', detailTarget.issn],
                ['eISSN', detailTarget.eissn],
                ['Cơ quan xuất bản', detailTarget.organization],
                ['Ngành / Liên ngành', detailTarget.field],
                ['Điểm quy đổi', detailTarget.points],
                ['Quartile', detailTarget.quartile],
                ['IF / Impact Factor (JCR)', detailTarget.jcr_score],
                ['SJR Score', detailTarget.sjr_score],
                ['H-index', detailTarget.h_index != null ? String(detailTarget.h_index) : null],
                ['Ghi chú', detailTarget.notes],
              ] as [string, string | null | undefined][]).map(([label, value]) => value != null && value !== '' ? (
                <div key={label} className="flex gap-3">
                  <span className="text-slate-500 w-44 flex-shrink-0">{label}</span>
                  <span className="text-slate-800">{value}</span>
                </div>
              ) : null)}
              {detailTarget.url && (
                <div className="flex gap-3">
                  <span className="text-slate-500 w-44 flex-shrink-0">Link</span>
                  <a href={detailTarget.url} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-1 text-xs">
                    <ExternalLink size={12} /> Mở trang web
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-slate-900">{modal === 'create' ? 'Thêm tạp chí / hội nghị' : 'Sửa tạp chí / hội nghị'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {formError && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</div>}

              <FormField label="Tên tạp chí / hội nghị *">
                <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tên đầy đủ" />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="ISSN">
                  <input className={inputCls} value={form.issn} onChange={e => setForm(f => ({ ...f, issn: e.target.value }))} placeholder="0000-0000" />
                </FormField>
                <FormField label="eISSN">
                  <input className={inputCls} value={form.eissn} onChange={e => setForm(f => ({ ...f, eissn: e.target.value }))} placeholder="0000-0000" />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Danh mục">
                  <select className={inputCls} value={form.list_type} onChange={e => setForm(f => ({ ...f, list_type: e.target.value as JournalListType }))}>
                    {LIST_TYPES.filter(l => l.value).map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Loại">
                  <input className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="Tạp chí / Hội nghị" />
                </FormField>
              </div>

              <FormField label="Cơ quan xuất bản">
                <input className={inputCls} value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} />
              </FormField>

              <FormField label="Ngành / Liên ngành">
                <input className={inputCls} value={form.field} onChange={e => setForm(f => ({ ...f, field: e.target.value }))} />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Điểm quy đổi">
                  <input className={inputCls} value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} placeholder="Vd: 0-3,0" />
                </FormField>
                <FormField label="Quartile">
                  <select className={inputCls} value={form.quartile} onChange={e => setForm(f => ({ ...f, quartile: e.target.value }))}>
                    {QUARTILES.map(q => <option key={q} value={q}>{q || '—'}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="IF / JCR">
                  <input className={inputCls} value={form.jcr_score} onChange={e => setForm(f => ({ ...f, jcr_score: e.target.value }))} placeholder="Vd: 4.21" />
                </FormField>
                <FormField label="SJR Score">
                  <input className={inputCls} value={form.sjr_score} onChange={e => setForm(f => ({ ...f, sjr_score: e.target.value }))} />
                </FormField>
                <FormField label="H-index">
                  <input className={inputCls} type="number" value={form.h_index} onChange={e => setForm(f => ({ ...f, h_index: e.target.value }))} />
                </FormField>
              </div>

              <FormField label="Link tạp chí">
                <input className={inputCls} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </FormField>

              <FormField label="Ghi chú">
                <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </FormField>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-slate-600 mb-4">
              Xóa tạp chí <span className="font-medium">"{deleteTarget.name}"</span>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Hủy</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300';

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
