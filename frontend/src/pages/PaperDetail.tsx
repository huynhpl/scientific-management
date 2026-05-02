import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, ExternalLink, Upload, X, FileText, Clock, Plus, Globe, BookOpen } from 'lucide-react';
import type { Paper, Author, Venue, PaperFile } from '../types';
import { ROLE_LABEL } from '../types';
import { papersApi, authorsApi, venuesApi, uploadFile, deleteFile, formatDate } from '../utils/api';
import { StatusBadge, TypeBadge } from '../components/StatusBadge';
import PaperModal from '../components/PaperModal';

const FILE_TYPES = ['manuscript', 'supplementary', 'review', 'revision', 'camera_ready', 'other'];
const FILE_TYPE_LABEL: Record<string, string> = { manuscript: 'Bản thảo', supplementary: 'Phụ lục', review: 'Review', revision: 'Bản sửa', camera_ready: 'Camera ready', other: 'Khác' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1.5">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-32 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}

export default function PaperDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fileType, setFileType] = useState('manuscript');

  function load() {
    Promise.all([papersApi.get(parseInt(id!)), authorsApi.list(), venuesApi.list()])
      .then(([p, a, v]) => { setPaper(p); setAuthors(a); setVenues(v); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function handleDelete() {
    if (!paper || !confirm(`Xóa bài báo "${paper.title}"?`)) return;
    await papersApi.delete(paper.id);
    navigate('/papers');
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !paper) return;
    await papersApi.addActivity(paper.id, note);
    setNote('');
    load();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !paper) return;
    setUploading(true);
    await uploadFile(paper.id, file, fileType);
    setUploading(false);
    e.target.value = '';
    load();
  }

  async function handleDeleteFile(file: PaperFile) {
    if (!confirm(`Xóa file "${file.original_name}"?`)) return;
    await deleteFile(file.id);
    load();
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  if (!paper) return <p className="text-red-500">Không tìm thấy bài báo</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back + Actions */}
      <div className="flex items-start justify-between">
        <button onClick={() => navigate('/papers')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-secondary"><Edit2 size={14} /> Chỉnh sửa</button>
          <button onClick={handleDelete} className="btn-danger"><Trash2 size={14} /> Xóa</button>
        </div>
      </div>

      {/* Title + badges */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusBadge status={paper.status} />
          <TypeBadge type={paper.type} />
          {paper.venue?.ranking && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{paper.venue.ranking}</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-slate-900 leading-snug">{paper.title}</h1>
        {paper.authors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {paper.authors.map(a => (
              <span key={a.id} className={`text-sm px-2.5 py-1 rounded-full ${a.role === 'first' ? 'bg-indigo-100 text-indigo-700 font-medium' : a.role === 'corresponding' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-slate-100 text-slate-600'}`}>
                {a.name}
                <span className="ml-1 text-xs opacity-70">({ROLE_LABEL[a.role]})</span>
              </span>
            ))}
          </div>
        )}
        {paper.venue && (
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
            <BookOpen size={14} className="text-slate-400" />
            <span className="font-medium">{paper.venue.name}</span>
            {paper.venue.abbreviation && <span className="text-slate-400">({paper.venue.abbreviation})</span>}
            {paper.venue.impact_factor && <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">IF: {paper.venue.impact_factor}</span>}
          </div>
        )}
        {paper.abstract && (
          <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{paper.abstract}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Timeline */}
        <Section title="Thời gian">
          <InfoRow label="Deadline nộp" value={paper.submission_deadline ? formatDate(paper.submission_deadline) : undefined} />
          <InfoRow label="Deadline sửa" value={paper.revision_deadline ? formatDate(paper.revision_deadline) : undefined} />
          <InfoRow label="Ngày nộp" value={paper.submission_date ? formatDate(paper.submission_date) : undefined} />
          <InfoRow label="Kết quả" value={paper.decision_date ? formatDate(paper.decision_date) : undefined} />
          <InfoRow label="Xuất bản" value={paper.publication_date ? formatDate(paper.publication_date) : undefined} />
          <InfoRow label="Cập nhật" value={formatDate(paper.updated_at)} />
          {!paper.submission_deadline && !paper.submission_date && !paper.decision_date && (
            <p className="text-slate-400 text-sm">Chưa có thông tin thời gian</p>
          )}
        </Section>

        {/* Links */}
        <Section title="Liên kết">
          {paper.doi && <InfoRow label="DOI" value={<a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">{paper.doi} <ExternalLink size={11} /></a>} />}
          {paper.arxiv_url && <InfoRow label="ArXiv" value={<a href={paper.arxiv_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">ArXiv <ExternalLink size={11} /></a>} />}
          {paper.paper_url && <InfoRow label="Paper URL" value={<a href={paper.paper_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1"><Globe size={12} /> Link <ExternalLink size={11} /></a>} />}
          {paper.openreview_url && <InfoRow label="OpenReview" value={<a href={paper.openreview_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">OpenReview <ExternalLink size={11} /></a>} />}
          {!paper.doi && !paper.arxiv_url && !paper.paper_url && !paper.openreview_url && (
            <p className="text-slate-400 text-sm">Chưa có liên kết</p>
          )}
        </Section>
      </div>

      {/* Notes */}
      {paper.notes && (
        <Section title="Ghi chú">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{paper.notes}</p>
        </Section>
      )}

      {/* Files */}
      <Section title="File đính kèm">
        <div className="flex items-center gap-2 mb-4">
          <select className="input w-40 text-sm" value={fileType} onChange={e => setFileType(e.target.value)}>
            {FILE_TYPES.map(t => <option key={t} value={t}>{FILE_TYPE_LABEL[t]}</option>)}
          </select>
          <label className={`btn-secondary cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
            <Upload size={14} /> {uploading ? 'Đang tải...' : 'Upload file'}
            <input type="file" className="hidden" accept=".pdf,.docx,.doc,.tex,.zip,.png,.jpg" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        {(!paper.files || paper.files.length === 0) ? (
          <p className="text-slate-400 text-sm text-center py-4">Chưa có file đính kèm</p>
        ) : (
          <div className="space-y-2">
            {paper.files.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={15} className="text-indigo-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <a href={`/uploads/${f.filename}`} target="_blank" rel="noreferrer"
                      className="text-sm font-medium text-slate-800 hover:text-indigo-600 truncate block">{f.original_name}</a>
                    <span className="text-xs text-slate-400">{FILE_TYPE_LABEL[f.file_type] || f.file_type} · {formatFileSize(f.size)} · {formatDate(f.uploaded_at)}</span>
                  </div>
                </div>
                <button onClick={() => handleDeleteFile(f)} className="p-1 text-slate-400 hover:text-red-500 flex-shrink-0 ml-2">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Activity Log */}
      <Section title="Nhật ký hoạt động">
        <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
          <input
            className="input flex-1"
            placeholder="Thêm ghi chú / cập nhật tiến độ..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button type="submit" className="btn-primary flex-shrink-0"><Plus size={14} /> Thêm</button>
        </form>
        {(!paper.activity || paper.activity.length === 0) ? (
          <p className="text-slate-400 text-sm text-center py-4">Chưa có hoạt động</p>
        ) : (
          <div className="space-y-3 relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200" />
            {paper.activity.map(a => (
              <div key={a.id} className="flex gap-3 pl-2">
                <div className="w-3 h-3 rounded-full bg-indigo-200 border-2 border-indigo-500 mt-1.5 flex-shrink-0 relative z-10" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{a.details}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                    <Clock size={11} />
                    {new Date(a.created_at).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {showEdit && (
        <PaperModal
          paper={paper}
          authors={authors}
          venues={venues}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}
    </div>
  );
}
