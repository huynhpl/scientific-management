import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileApi } from '../utils/api';
import type { ProfileData, ProfilePaper } from '../utils/api';
import { STATUS_LABEL, STATUS_COLOR, TYPE_LABEL, ROLE_LABEL } from '../types';
import { ExternalLink, FileText, Award, TrendingUp, Clock, AlertCircle } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const PGS = { total: 10, recent: 2.5, paper: 6, first: 3, label: 'PGS', color: 'amber' };
const GS  = { total: 20, recent: 5.0, paper: 12, first: 5, label: 'GS',  color: 'indigo' };

const SCORE_COLOR: Record<string, string> = {
  'Q1': 'bg-emerald-100 text-emerald-700',
  'Q2': 'bg-blue-100 text-blue-700',
  'Q3': 'bg-amber-100 text-amber-700',
  'Q4': 'bg-orange-100 text-orange-700',
  'A*': 'bg-emerald-100 text-emerald-700',
  'A':  'bg-blue-100 text-blue-700',
  'B':  'bg-amber-100 text-amber-700',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, accent,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent: string;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3`}>
      <div className={`p-2 rounded-lg ${accent}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({
  label, value, max, color, note,
}: {
  label: string; value: number; max: number; color: 'amber' | 'indigo'; note?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const done = value >= max;
  const barColor = color === 'amber'
    ? (done ? 'bg-amber-400' : 'bg-amber-300')
    : (done ? 'bg-indigo-500' : 'bg-indigo-400');
  const textColor = color === 'amber' ? 'text-amber-700' : 'text-indigo-700';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className={`text-xs font-semibold ${done ? textColor : 'text-slate-500'}`}>
          {value.toFixed(value % 1 === 0 ? 0 : 2)} / {max}
          {done && ' ✓'}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
    </div>
  );
}

function ProgressColumn({
  target, totals, first_author,
}: {
  target: typeof PGS;
  totals: ProfileData['totals'];
  first_author: number;
}) {
  const t = totals!;
  const color = target.color as 'amber' | 'indigo';
  const headerBg = color === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200';
  const headerText = color === 'amber' ? 'text-amber-800' : 'text-indigo-800';
  const dot = color === 'amber' ? 'bg-amber-400' : 'bg-indigo-500';

  const allMet = t.total_score >= target.total
    && t.score_3y >= target.recent
    && t.paper_score >= target.paper
    && first_author >= target.first;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className={`px-5 py-4 border-b ${headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
            <h3 className={`font-semibold text-sm ${headerText}`}>{target.label}</h3>
          </div>
          {allMet && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
              Đủ điều kiện ✓
            </span>
          )}
        </div>
        <p className={`text-xs mt-0.5 ${color === 'amber' ? 'text-amber-600' : 'text-indigo-600'}`}>
          Điểm tối thiểu: {target.total} · 3 năm cuối: {target.recent}
        </p>
      </div>

      <div className="px-5 py-4 space-y-3.5">
        <ProgressBar
          label="Tổng điểm công trình KH quy đổi"
          value={t.total_score} max={target.total} color={color}
        />
        <ProgressBar
          label="Điểm trong 3 năm cuối"
          value={t.score_3y} max={target.recent} color={color}
          note="Tính theo ngày chấp nhận hoặc xuất bản"
        />
        <ProgressBar
          label="Điểm từ bài báo KH (KHTN / KT / CN / Y Dược)"
          value={t.paper_score} max={target.paper} color={color}
          note="Bài báo trên tạp chí quốc tế uy tín"
        />
        <ProgressBar
          label="Bài báo tác giả chính (từ 2020)"
          value={first_author} max={target.first} color={color}
        />
      </div>

      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 space-y-1.5">
        <p className="text-xs font-medium text-slate-500 mb-1">Tiêu chí cần xác nhận thủ công</p>
        {[
          color === 'amber'
            ? '≥ 275 giờ chuẩn / năm · ≥ 6 năm công tác'
            : '≥ 275 giờ chuẩn / năm · ≥ 9 năm công tác (≥ 3 năm PGS)',
          color === 'amber'
            ? 'Ngoại ngữ B2 · Tiến sĩ ≥ 3 năm'
            : 'Ngoại ngữ B2 · PGS ≥ 3 năm',
          color === 'amber'
            ? 'Hướng dẫn: ≥ 2 HV ThS hoặc ≥ 1 NCS TS'
            : 'Hướng dẫn: ≥ 2 NCS TS đã bảo vệ',
          color === 'amber'
            ? 'Chủ trì: ≥ 2 đề tài cơ sở hoặc ≥ 1 đề tài cấp Bộ'
            : 'Chủ trì: ≥ 2 đề tài cấp Bộ hoặc ≥ 1 cấp Quốc gia',
        ].map((txt, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
            <span className="text-slate-300 mt-0.5">·</span>
            <span>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'bai_bao' | 'hoi_nghi'>('all');

  useEffect(() => {
    profileApi.get().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-16 text-slate-400 text-sm">Đang tải...</div>;
  }

  if (!data?.author) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white border border-slate-200 rounded-xl p-8 text-center">
        <AlertCircle size={36} className="mx-auto text-amber-400 mb-3" />
        <h3 className="font-semibold text-slate-800 mb-1">Chưa liên kết thành viên</h3>
        <p className="text-sm text-slate-500">
          Tài khoản <span className="font-medium">{user?.username}</span> chưa được liên kết với hồ sơ thành viên.
          Nhờ admin cấu hình trong phần Quản lý người dùng.
        </p>
      </div>
    );
  }

  const { author, papers, totals } = data;
  const first_author = totals?.first_author_count ?? 0;

  const visiblePapers = papers.filter(p =>
    filter === 'all' ? true : p.category === filter
  );

  const initials = author.name.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase();

  return (
    <div className="space-y-5 max-w-6xl">
      {/* ── Author card ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-5">
        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">{author.name}</h2>
            {author.member_role && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                {author.member_role}
              </span>
            )}
            {author.group_type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                {author.group_type}
              </span>
            )}
          </div>
          {author.affiliation && <p className="text-sm text-slate-500 mt-0.5">{author.affiliation}</p>}
          {author.email && <p className="text-xs text-slate-400 mt-0.5">{author.email}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400">Tài khoản</p>
          <p className="text-sm font-medium text-slate-700">{user?.username}</p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
            user?.role === 'admin' ? 'bg-red-100 text-red-700' :
            user?.role === 'lead' ? 'bg-amber-100 text-amber-700' :
            'bg-green-100 text-green-700'
          }`}>
            {user?.role}
          </span>
        </div>
      </div>

      {/* ── Score summary cards ── */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Tổng điểm quy đổi"
            value={totals.total_score.toFixed(2)}
            sub={`${totals.total_accepted} bài được tính điểm`}
            icon={<Award size={16} className="text-indigo-600" />}
            accent="bg-indigo-50"
          />
          <StatCard
            label="Điểm 3 năm cuối"
            value={totals.score_3y.toFixed(2)}
            sub="Tính từ ngày chấp nhận"
            icon={<Clock size={16} className="text-amber-600" />}
            accent="bg-amber-50"
          />
          <StatCard
            label="Điểm bài báo KH"
            value={totals.paper_score.toFixed(2)}
            sub={`Hội nghị: ${totals.conf_score.toFixed(2)} điểm`}
            icon={<TrendingUp size={16} className="text-emerald-600" />}
            accent="bg-emerald-50"
          />
          <StatCard
            label="Tác giả chính"
            value={totals.first_author_count}
            sub={`Tổng ${totals.total_papers} bài đã tham gia`}
            icon={<FileText size={16} className="text-purple-600" />}
            accent="bg-purple-50"
          />
        </div>
      )}

      {/* ── PGS / GS Progress ── */}
      {totals && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ProgressColumn target={PGS} totals={totals} first_author={first_author} />
          <ProgressColumn target={GS}  totals={totals} first_author={first_author} />
        </div>
      )}

      {/* ── Papers table ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-sm text-slate-800">
            Danh sách công trình khoa học
          </h3>
          <div className="flex gap-1">
            {([['all', 'Tất cả'], ['bai_bao', 'Bài báo'], ['hoi_nghi', 'Hội nghị']] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                  filter === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Tiêu đề</th>
                <th className="px-4 py-3 text-left font-medium w-24">Loại</th>
                <th className="px-4 py-3 text-left font-medium w-28">Trạng thái</th>
                <th className="px-4 py-3 text-left font-medium w-36">Hội nghị / Tạp chí</th>
                <th className="px-4 py-3 text-left font-medium w-24">Vai trò</th>
                <th className="px-4 py-3 text-center font-medium w-16">Xếp hạng</th>
                <th className="px-4 py-3 text-right font-medium w-20">Điểm gốc</th>
                <th className="px-4 py-3 text-right font-medium w-24">Điểm của tôi</th>
                <th className="px-4 py-3 text-center font-medium w-16">3 năm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visiblePapers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Chưa có công trình nào.
                  </td>
                </tr>
              ) : visiblePapers.map(p => (
                <PaperRow key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        </div>

        {totals && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>
              {totals.total_accepted} công trình được tính điểm · {papers.filter(p => !p.countable).length} chưa tính (đang xét / bản thảo)
            </span>
            <span className="font-semibold text-slate-700">
              Tổng điểm: {totals.total_score.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* ── Yearly breakdown ── */}
      {totals && totals.by_year.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-sm text-slate-800 mb-4">Điểm theo năm</h3>
          <div className="flex items-end gap-2 h-28">
            {totals.by_year.slice(0, 10).reverse().map(({ year, count, score }) => {
              const maxScore = Math.max(...totals.by_year.map(y => y.score), 1);
              const h = Math.max(8, (score / maxScore) * 88);
              return (
                <div key={year} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-xs text-slate-500">{score.toFixed(1)}</span>
                  <div
                    className="w-full rounded-t-md bg-indigo-400 hover:bg-indigo-500 transition-colors cursor-default"
                    style={{ height: h }}
                    title={`${year}: ${count} bài, ${score.toFixed(2)} điểm`}
                  />
                  <span className="text-[10px] text-slate-400 truncate w-full text-center">{year}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Scoring method note ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-600">Ghi chú về cách tính điểm</p>
        <p>· <strong>Tác giả chính / tác giả liên hệ:</strong> 1/3 điểm gốc + chia đều phần 2/3 còn lại cho tất cả tác giả.</p>
        <p>· <strong>Đồng tác giả:</strong> chia đều phần 2/3 điểm gốc theo số tác giả.</p>
        <p>· <strong>Chỉ tính</strong> các bài đã được Chấp nhận hoặc Xuất bản (trừ Preprint).</p>
        <p>· Điểm bài báo dựa trên xếp hạng venue (Q1–Q4 / A*–B). Cập nhật xếp hạng trong mục <em>Tạp chí / HN</em> để có kết quả chính xác hơn.</p>
      </div>
    </div>
  );
}

function PaperRow({ p }: { p: ProfilePaper }) {
  const dateStr = p.decision_date || p.publication_date || p.submission_date;
  const year = dateStr ? new Date(dateStr).getFullYear() : '—';

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${!p.countable ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3 max-w-xs">
        <div className="font-medium text-slate-800 text-sm line-clamp-2 leading-snug">
          {p.title}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{year}</div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-600">{TYPE_LABEL[p.type as keyof typeof TYPE_LABEL] ?? p.type}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status as keyof typeof STATUS_COLOR] ?? 'bg-slate-100 text-slate-600'}`}>
          {STATUS_LABEL[p.status as keyof typeof STATUS_LABEL] ?? p.status}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[140px]" title={p.venue_name}>
        {p.venue_abbr || p.venue_name || '—'}
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">
        {ROLE_LABEL[p.role as keyof typeof ROLE_LABEL] ?? p.role}
      </td>
      <td className="px-4 py-3 text-center">
        {p.score_label !== '—' ? (
          <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${SCORE_COLOR[p.score_label] ?? 'bg-slate-100 text-slate-600'}`}>
            {p.score_label}
          </span>
        ) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3 text-right text-xs text-slate-600">
        {p.base_score > 0 ? p.base_score.toFixed(2) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        {p.user_score > 0 ? (
          <span className="text-sm font-bold text-indigo-600">{p.user_score.toFixed(3)}</span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {p.recent_3y ? (
          <span className="text-emerald-500 text-xs font-medium">✓</span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}
