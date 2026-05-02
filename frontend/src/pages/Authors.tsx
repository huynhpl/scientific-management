import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, Star, ExternalLink } from 'lucide-react';
import type { Author, MemberGroup, MemberRole } from '../types';
import { MEMBER_GROUP_OPTIONS, MEMBER_ROLE_OPTIONS, MEMBER_GROUP_COLOR, MEMBER_ROLE_COLOR } from '../types';
import { authorsApi } from '../utils/api';

interface AuthorForm { name: string; email: string; affiliation: string; is_member: boolean; group_type: MemberGroup; member_role: MemberRole }

const EMPTY: AuthorForm = { name: '', email: '', affiliation: '', is_member: true, group_type: 'AI', member_role: 'SV' };

function Modal({ author, onClose, onSaved }: { author?: Author | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<AuthorForm>(
    author ? { name: author.name, email: author.email || '', affiliation: author.affiliation || '', is_member: !!author.is_member, group_type: author.group_type || 'Khác', member_role: author.member_role || 'SV' } : EMPTY
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof AuthorForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: (e.target as HTMLInputElement).type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, is_member: form.is_member ? 1 : 0 };
      if (author) await authorsApi.update(author.id, payload);
      else await authorsApi.create(payload);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">{author ? 'Chỉnh sửa thành viên' : 'Thêm thành viên'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Họ và tên *</label>
            <input className="input" value={form.name} onChange={set('name')} required placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="email@university.edu" />
          </div>
          <div>
            <label className="label">Đơn vị / Trường</label>
            <input className="input" value={form.affiliation} onChange={set('affiliation')} placeholder="Đại học Bách Khoa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nhóm</label>
              <select className="input" value={form.group_type} onChange={set('group_type')}>
                {MEMBER_GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vai trò</label>
              <select className="input" value={form.member_role} onChange={set('member_role')}>
                {MEMBER_ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_member} onChange={set('is_member')} className="rounded border-slate-300 text-indigo-600" />
            <span className="text-sm text-slate-700">Thành viên nhóm nghiên cứu</span>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Lưu...' : author ? 'Lưu' : 'Thêm'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Authors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAuthor, setEditAuthor] = useState<Author | null>(null);

  function load() { authorsApi.list().then(setAuthors).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, []);

  function handleDelete(a: Author) {
    if (!confirm(`Xóa "${a.name}"?`)) return;
    authorsApi.delete(a.id).then(load);
  }

  const members = authors.filter(a => a.is_member);
  const collaborators = authors.filter(a => !a.is_member);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users size={16} />
          <span><strong className="text-slate-900">{members.length}</strong> thành viên, <strong className="text-slate-900">{collaborators.length}</strong> cộng tác</span>
        </div>
        <button onClick={() => { setEditAuthor(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> Thêm thành viên
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : (
        <>
          {/* Members */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Star size={14} className="text-amber-500" /> Thành viên nhóm ({members.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map(a => (
                <div key={a.id} className="card p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {a.name.split(' ').pop()?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{a.name}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${MEMBER_GROUP_COLOR[a.group_type] || 'bg-slate-100 text-slate-600'}`}>{a.group_type || 'Khác'}</span>
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${MEMBER_ROLE_COLOR[a.member_role] || 'bg-slate-100 text-slate-600'}`}>{a.member_role || 'SV'}</span>
                    </div>
                    {a.affiliation && <p className="text-xs text-slate-500 truncate mt-0.5">{a.affiliation}</p>}
                    {a.email && (
                      <a href={`mailto:${a.email}`} className="text-xs text-indigo-500 hover:underline flex items-center gap-0.5 mt-0.5 truncate">
                        <ExternalLink size={9} /> {a.email}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditAuthor(a); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(a)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Collaborators */}
          {collaborators.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Cộng tác viên ({collaborators.length})</h3>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-th">Tên</th>
                      <th className="table-th">Email</th>
                      <th className="table-th">Đơn vị</th>
                      <th className="table-th">Nhóm / Vai trò</th>
                      <th className="table-th">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collaborators.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="table-td font-medium">{a.name}</td>
                        <td className="table-td text-slate-500">{a.email || '—'}</td>
                        <td className="table-td text-slate-500">{a.affiliation || '—'}</td>
                        <td className="table-td">
                          <div className="flex gap-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${MEMBER_GROUP_COLOR[a.group_type] || 'bg-slate-100 text-slate-600'}`}>{a.group_type || 'Khác'}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${MEMBER_ROLE_COLOR[a.member_role] || 'bg-slate-100 text-slate-600'}`}>{a.member_role || 'SV'}</span>
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="flex gap-1">
                            <button onClick={() => { setEditAuthor(a); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete(a)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <Modal author={editAuthor} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
