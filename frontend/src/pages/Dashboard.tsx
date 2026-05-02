import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend
} from 'recharts';
import { FileText, Clock, CheckCircle, BookOpen, AlertTriangle, TrendingUp, Target, UsersRound } from 'lucide-react';
import type { Stats } from '../types';
import { STATUS_LABEL, STATUS_COLOR } from '../types';
import { statsApi, formatDate, daysUntil, deadlineClass } from '../utils/api';
import { StatusBadge } from '../components/StatusBadge';

const STATUS_CHART_COLORS: Record<string, string> = {
  draft: '#94a3b8', submitted: '#60a5fa', under_review: '#fbbf24',
  major_revision: '#f97316', minor_revision: '#facc15',
  accepted: '#4ade80', rejected: '#f87171', published: '#a78bfa', withdrawn: '#9ca3af',
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number; sub?: string; color: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-600 font-medium">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    statsApi.overview().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!stats) return <p className="text-red-500">Không thể tải dữ liệu</p>;

  const pieData = stats.byStatus.map(s => ({
    name: STATUS_LABEL[s.status as keyof typeof STATUS_LABEL] || s.status,
    value: s.count,
    status: s.status,
  }));

  const typeData = stats.byType.map(t => ({
    name: t.type === 'journal' ? 'Tạp chí' : t.type === 'conference' ? 'Hội nghị' : t.type,
    value: t.count,
  }));

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Tổng bài báo" value={stats.total} color="bg-indigo-500" />
        <StatCard icon={Clock} label="Đang xử lý" value={stats.underReview} sub="nộp/phản biện/chỉnh sửa" color="bg-amber-500" />
        <StatCard icon={CheckCircle} label={`Chấp nhận ${currentYear}`} value={stats.acceptedThisYear} sub="trong năm nay" color="bg-green-500" />
        <StatCard icon={BookOpen} label={`Xuất bản ${currentYear}`} value={stats.publishedThisYear} sub="trong năm nay" color="bg-purple-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Phân bổ theo trạng thái</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_CHART_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} bài`, name]} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-center py-12 text-sm">Chưa có dữ liệu</p>}
        </div>

        {/* Author bar */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Bài báo theo thành viên</h3>
          {stats.byAuthor.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byAuthor.slice(0, 6)} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90}
                  tickFormatter={v => v.split(' ').slice(-1)[0]} />
                <Tooltip formatter={(val, name) => [val, name === 'total' ? 'Tổng' : 'Chấp nhận']} />
                <Legend iconSize={8} formatter={v => <span className="text-xs">{v === 'total' ? 'Tổng' : 'Chấp nhận'}</span>} />
                <Bar dataKey="total" fill="#818cf8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="accepted" fill="#4ade80" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-center py-12 text-sm">Chưa có dữ liệu</p>}
        </div>
      </div>

      {/* Team KPI row */}
      {stats.byTeam && stats.byTeam.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-700">KPI nhóm năm {currentYear}</h3>
            </div>
            <a href="/teams" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
              <UsersRound size={12} /> Xem chi tiết
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.byTeam.map(t => {
              const pct = t.kpi > 0 ? Math.min((t.achieved / t.kpi) * 100, 100) : 0;
              const barColor = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-500' : pct >= 30 ? 'bg-amber-400' : 'bg-slate-300';
              return (
                <div key={t.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-slate-800 truncate mr-2">{t.name}</p>
                    {pct >= 100 && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">Đạt</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 flex-shrink-0">{t.achieved}/{t.kpi}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming deadlines */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">Deadline trong 30 ngày</h3>
          </div>
          {stats.deadlines.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Không có deadline sắp tới</p>
          ) : (
            <div className="space-y-3">
              {stats.deadlines.map(d => {
                const dl = d.revision_deadline || d.submission_deadline;
                const days = daysUntil(dl);
                return (
                  <div
                    key={d.id}
                    onClick={() => navigate(`/papers/${d.id}`)}
                    className="flex items-start justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-100"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-slate-900 truncate">{d.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={d.status as any} />
                        {d.venue_abbreviation && <span className="text-xs text-slate-500">{d.venue_abbreviation}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${deadlineClass(days)}`}>
                        {days !== null && days < 0 ? 'Quá hạn' : days === 0 ? 'Hôm nay!' : `${days}d`}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(dl)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By venue */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Theo venue</h3>
          </div>
          {stats.byVenue.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {stats.byVenue.map((v, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600">{v.abbreviation || v.name.substring(0, 8)}</span>
                      <span className="text-xs text-slate-500 truncate">{v.name}</span>
                    </div>
                    <div className="mt-1 bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-400 h-1.5 rounded-full"
                        style={{ width: `${(v.count / stats.byVenue[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="ml-3 text-sm font-semibold text-slate-700 flex-shrink-0">{v.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
