import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, Target, ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react';
import type { Team, TeamDetail, TeamMember, Author } from '../types';
import { teamsApi, authorsApi } from '../utils/api';

// ── KPI progress bar ────────────────────────────────────────────────────────
function KpiBar({ achieved, kpi, inProgress }: { achieved: number; kpi: number; inProgress?: number }) {
  const pct = kpi > 0 ? Math.min((achieved / kpi) * 100, 100) : 0;
  const color = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-500' : pct >= 30 ? 'bg-amber-400' : 'bg-slate-300';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-semibold ${pct >= 100 ? 'text-green-600' : 'text-slate-700'}`}>
          {achieved}/{kpi} bài {pct >= 100 && '✓'}
        </span>
        {inProgress !== undefined && inProgress > 0 && (
          <span className="text-amber-600">{inProgress} đang xử lý</span>
        )}
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Team modal (create/edit) ─────────────────────────────────────────────────
interface TeamForm { name: string; description: string; kpi_papers_per_year: number }
const EMPTY_TEAM: TeamForm = { name: '', description: '', kpi_papers_per_year: 0 };

function TeamModal({ team, onClose, onSaved }: { team?: Team | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<TeamForm>(
    team ? { name: team.name, description: team.description || '', kpi_papers_per_year: team.kpi_papers_per_year } : EMPTY_TEAM
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (team) await teamsApi.update(team.id, { ...form });
      else await teamsApi.create({ ...form });
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">{team ? 'Chỉnh sửa nhóm' : 'Thêm nhóm nghiên cứu'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Tên nhóm *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="VD: Nhóm Xử lý Ngôn ngữ Tự nhiên" />
          </div>
          <div>
            <label className="label">Mô tả</label>
            <textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Hướng nghiên cứu chính của nhóm..." />
          </div>
          <div>
            <label className="label">KPI bài báo / năm</label>
            <input type="number" className="input" min={0} value={form.kpi_papers_per_year} onChange={e => setForm(f => ({ ...f, kpi_papers_per_year: Number(e.target.value) }))} />
            <p className="text-xs text-slate-400 mt-1">Mục tiêu tổng số bài được chấp nhận/xuất bản trong năm</p>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Lưu...' : team ? 'Lưu' : 'Tạo nhóm'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add member modal ──────────────────────────────────────────────────────────
function AddMemberModal({ teamId, existingIds, allAuthors, onClose, onSaved }: {
  teamId: number; existingIds: number[]; allAuthors: Author[]; onClose: () => void; onSaved: () => void;
}) {
  const available = allAuthors.filter(a => !existingIds.includes(a.id));
  const [authorId, setAuthorId] = useState(available[0]?.id ?? 0);
  const [kpi, setKpi] = useState(1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorId) return;
    setSaving(true);
    try {
      await teamsApi.addMember(teamId, authorId, kpi);
      onSaved();
    } finally { setSaving(false); }
  }

  if (available.length === 0) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <p className="text-slate-600 mb-4">Tất cả thành viên đã được thêm vào nhóm.</p>
        <button onClick={onClose} className="btn-secondary">Đóng</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Thêm thành viên</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Thành viên</label>
            <select className="input" value={authorId} onChange={e => setAuthorId(Number(e.target.value))}>
              {available.map(a => <option key={a.id} value={a.id}>{a.name}{!a.is_member ? ' (Cộng tác)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">KPI cá nhân (bài/năm)</label>
            <input type="number" className="input" min={0} value={kpi} onChange={e => setKpi(Number(e.target.value))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Lưu...' : 'Thêm'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Member row with inline KPI edit ──────────────────────────────────────────
function MemberRow({ member, teamId, onRefresh }: { member: TeamMember; teamId: number; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [kpi, setKpi] = useState(member.kpi_papers);

  async function saveKpi() {
    await teamsApi.updateMember(teamId, member.id, kpi);
    setEditing(false);
    onRefresh();
  }

  async function remove() {
    if (!confirm(`Xóa "${member.name}" khỏi nhóm?`)) return;
    await teamsApi.removeMember(teamId, member.id);
    onRefresh();
  }

  const pct = member.kpi_papers > 0 ? Math.min((member.achieved / member.kpi_papers) * 100, 100) : 0;
  const barColor = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-400' : pct >= 30 ? 'bg-amber-400' : 'bg-slate-200';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
        {member.name.split(' ').pop()?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{member.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden" style={{ maxWidth: 120 }}>
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-500">
            {member.achieved}/{member.kpi_papers} bài
            {member.in_progress > 0 && <span className="text-amber-500 ml-1">+{member.in_progress}</span>}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {editing ? (
          <>
            <input type="number" className="input w-16 text-xs py-1" min={0} value={kpi} onChange={e => setKpi(Number(e.target.value))} autoFocus />
            <button onClick={saveKpi} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">✓</button>
            <button onClick={() => { setEditing(false); setKpi(member.kpi_papers); }} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">✕</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} title="Sửa KPI" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
              <Edit2 size={12} />
            </button>
            <button onClick={remove} title="Xóa khỏi nhóm" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Team card ─────────────────────────────────────────────────────────────────
function TeamCard({ team, allAuthors, onEdit, onDelete, onRefresh }: {
  team: Team; allAuthors: Author[]; onEdit: () => void; onDelete: () => void; onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  async function loadDetail() {
    const d = await teamsApi.get(team.id);
    setDetail(d);
  }

  function toggle() {
    if (!expanded) loadDetail();
    setExpanded(e => !e);
  }

  const achieved = team.achieved ?? 0;
  const kpi = team.kpi_papers_per_year;
  const pct = kpi > 0 ? Math.min((achieved / kpi) * 100, 100) : 0;
  const currentYear = new Date().getFullYear();

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 text-base">{team.name}</h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex-shrink-0">
                {team.member_count} thành viên
              </span>
            </div>
            {team.description && <p className="text-sm text-slate-500 mb-3">{team.description}</p>}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14} /></button>
            <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
          </div>
        </div>

        {/* Team KPI */}
        <div className="bg-slate-50 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-indigo-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-700">KPI nhóm {currentYear}</span>
            {pct >= 100 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Đạt KPI!</span>}
          </div>
          <KpiBar achieved={achieved} kpi={kpi} inProgress={team.in_progress} />
        </div>

        {/* Expand toggle */}
        <button onClick={toggle} className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 py-1">
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            Thành viên & KPI cá nhân
          </span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Members panel */}
      {expanded && (
        <div className="border-t border-slate-100 bg-white">
          <div className="px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Thanh màu cam = đang xử lý</p>
            <button
              onClick={() => { loadDetail(); setShowAddMember(true); }}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <UserPlus size={13} /> Thêm thành viên
            </button>
          </div>
          <div className="px-4 pb-4 space-y-1">
            {!detail ? (
              <div className="flex justify-center py-6"><div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>
            ) : detail.members.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">Chưa có thành viên. Nhấn "Thêm thành viên" để bắt đầu.</p>
            ) : (
              detail.members.map(m => (
                <MemberRow key={m.id} member={m} teamId={team.id} onRefresh={() => { loadDetail(); onRefresh(); }} />
              ))
            )}
          </div>
        </div>
      )}

      {showAddMember && detail && (
        <AddMemberModal
          teamId={team.id}
          existingIds={detail.members.map(m => m.id)}
          allAuthors={allAuthors}
          onClose={() => setShowAddMember(false)}
          onSaved={() => { setShowAddMember(false); loadDetail(); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allAuthors, setAllAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);

  function load() {
    Promise.all([teamsApi.list(), authorsApi.list()])
      .then(([t, a]) => { setTeams(t); setAllAuthors(a); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function handleDelete(team: Team) {
    if (!confirm(`Xóa nhóm "${team.name}"? Dữ liệu thành viên trong nhóm cũng sẽ bị xóa.`)) return;
    teamsApi.delete(team.id).then(load);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <Target size={15} className="text-indigo-500" />
          <span>KPI năm <strong className="text-slate-900">{currentYear}</strong> — tính theo bài được chấp nhận hoặc xuất bản</span>
        </div>
        <button onClick={() => { setEditTeam(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> Thêm nhóm
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : teams.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Chưa có nhóm nào. Nhấn "Thêm nhóm" để tạo nhóm đầu tiên.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              allAuthors={allAuthors}
              onEdit={() => { setEditTeam(team); setShowModal(true); }}
              onDelete={() => handleDelete(team)}
              onRefresh={load}
            />
          ))}
        </div>
      )}

      {showModal && (
        <TeamModal
          team={editTeam}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
