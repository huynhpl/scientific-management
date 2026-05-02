import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileApi } from '../utils/api';
import { CheckCircle2, XCircle, HelpCircle, RefreshCw, ArrowDownToLine, Gauge } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pgsgssim_v1';

interface SimForm {
  total_score: string;
  score_3y: string;
  paper_score: string;
  first_author_count: string;
  teaching_hours: string;
  years_in_field: string;
  has_phd: boolean;
  years_since_phd: string;
  is_pgs: boolean;
  years_as_pgs: string;
  language_level: string;
  supervised_masters: string;
  supervised_phd: string;
  projects_institutional: string;
  projects_ministry: string;
  projects_national: string;
}

const DEFAULT: SimForm = {
  total_score: '', score_3y: '', paper_score: '', first_author_count: '',
  teaching_hours: '', years_in_field: '',
  has_phd: false, years_since_phd: '',
  is_pgs: false, years_as_pgs: '',
  language_level: '',
  supervised_masters: '', supervised_phd: '',
  projects_institutional: '', projects_ministry: '', projects_national: '',
};

type Status = 'met' | 'unmet' | 'empty';

interface Criterion {
  label: string;
  shortLabel: string;
  pgs: Status;
  gs: Status;
  pgsCurrent: string;
  pgsRequired: string;
  gsCurrent: string;
  gsRequired: string;
  pgsPct?: number;
  gsPct?: number;
}

// ── Computation ────────────────────────────────────────────────────────────────

function n(v: string, def = 0) { const x = parseFloat(v); return isNaN(x) ? def : x; }
function ni(v: string, def = 0) { const x = parseInt(v); return isNaN(x) ? def : x; }
function filled(v: string) { return v.trim() !== ''; }
function pct(val: number, max: number) { return Math.min(100, Math.round((val / max) * 100)); }

function status(cond: boolean, hasData: boolean): Status {
  return !hasData ? 'empty' : cond ? 'met' : 'unmet';
}

function compute(f: SimForm): Criterion[] {
  const ts   = n(f.total_score);
  const s3y  = n(f.score_3y);
  const ps   = n(f.paper_score);
  const fa   = ni(f.first_author_count);
  const th   = n(f.teaching_hours);
  const yf   = n(f.years_in_field);
  const yPhd = n(f.years_since_phd);
  const yPgs = n(f.years_as_pgs);
  const sm   = ni(f.supervised_masters);
  const sp   = ni(f.supervised_phd);
  const pi   = ni(f.projects_institutional);
  const pm   = ni(f.projects_ministry);
  const pn   = ni(f.projects_national);

  const langOk = ['B2', 'C1', 'C2', 'native'].includes(f.language_level);
  const tsF    = filled(f.total_score);
  const s3yF   = filled(f.score_3y);
  const psF    = filled(f.paper_score);
  const faF    = filled(f.first_author_count);
  const thF    = filled(f.teaching_hours);
  const yfF    = filled(f.years_in_field);
  const smF    = filled(f.supervised_masters) || filled(f.supervised_phd);
  const spF    = filled(f.supervised_phd);
  const projPF = filled(f.projects_institutional) || filled(f.projects_ministry);
  const projGF = filled(f.projects_ministry) || filled(f.projects_national);

  return [
    {
      label: 'Tổng điểm quy đổi',
      shortLabel: 'Tổng điểm',
      pgs: status(ts >= 10, tsF), gs: status(ts >= 20, tsF),
      pgsCurrent: tsF ? ts.toFixed(2) : '—', pgsRequired: '≥ 10',
      gsCurrent:  tsF ? ts.toFixed(2) : '—', gsRequired:  '≥ 20',
      pgsPct: tsF ? pct(ts, 10) : undefined,
      gsPct:  tsF ? pct(ts, 20) : undefined,
    },
    {
      label: 'Điểm trong 3 năm cuối',
      shortLabel: '3 năm cuối',
      pgs: status(s3y >= 2.5, s3yF), gs: status(s3y >= 5.0, s3yF),
      pgsCurrent: s3yF ? s3y.toFixed(2) : '—', pgsRequired: '≥ 2.5',
      gsCurrent:  s3yF ? s3y.toFixed(2) : '—', gsRequired:  '≥ 5.0',
      pgsPct: s3yF ? pct(s3y, 2.5) : undefined,
      gsPct:  s3yF ? pct(s3y, 5.0) : undefined,
    },
    {
      label: 'Điểm bài báo khoa học',
      shortLabel: 'Điểm bài báo',
      pgs: status(ps >= 6, psF), gs: status(ps >= 12, psF),
      pgsCurrent: psF ? ps.toFixed(2) : '—', pgsRequired: '≥ 6',
      gsCurrent:  psF ? ps.toFixed(2) : '—', gsRequired:  '≥ 12',
      pgsPct: psF ? pct(ps, 6)  : undefined,
      gsPct:  psF ? pct(ps, 12) : undefined,
    },
    {
      label: 'Bài báo tác giả chính',
      shortLabel: 'Tác giả chính',
      pgs: status(fa >= 3, faF), gs: status(fa >= 5, faF),
      pgsCurrent: faF ? `${fa} bài` : '—', pgsRequired: '≥ 3 bài',
      gsCurrent:  faF ? `${fa} bài` : '—', gsRequired:  '≥ 5 bài',
      pgsPct: faF ? pct(fa, 3) : undefined,
      gsPct:  faF ? pct(fa, 5) : undefined,
    },
    {
      label: 'Giờ chuẩn giảng dạy / năm',
      shortLabel: 'Giờ giảng dạy',
      pgs: status(th >= 275, thF), gs: status(th >= 275, thF),
      pgsCurrent: thF ? `${th} h` : '—', pgsRequired: '≥ 275 h',
      gsCurrent:  thF ? `${th} h` : '—', gsRequired:  '≥ 275 h',
      pgsPct: thF ? pct(th, 275) : undefined,
      gsPct:  thF ? pct(th, 275) : undefined,
    },
    {
      label: 'Thâm niên công tác',
      shortLabel: 'Thâm niên',
      pgs: status(yf >= 6, yfF), gs: status(yf >= 9, yfF),
      pgsCurrent: yfF ? `${yf} năm` : '—', pgsRequired: '≥ 6 năm',
      gsCurrent:  yfF ? `${yf} năm` : '—', gsRequired:  '≥ 9 năm',
      pgsPct: yfF ? pct(yf, 6) : undefined,
      gsPct:  yfF ? pct(yf, 9) : undefined,
    },
    {
      label: 'Bằng Tiến sĩ (PGS) / Chức danh PGS (GS)',
      shortLabel: 'TS / PGS',
      pgs: status(f.has_phd && yPhd >= 3, f.has_phd),
      gs:  status(f.is_pgs  && yPgs >= 3, f.is_pgs),
      pgsCurrent: f.has_phd ? (filled(f.years_since_phd) ? `TS ${yPhd} năm` : 'Có TS') : 'Chưa có',
      pgsRequired: 'TS ≥ 3 năm',
      gsCurrent: f.is_pgs ? (filled(f.years_as_pgs) ? `PGS ${yPgs} năm` : 'Là PGS') : 'Chưa có',
      gsRequired: 'PGS ≥ 3 năm',
    },
    {
      label: 'Trình độ ngoại ngữ',
      shortLabel: 'Ngoại ngữ',
      pgs: status(langOk, f.language_level !== ''),
      gs:  status(langOk, f.language_level !== ''),
      pgsCurrent: f.language_level || '—', pgsRequired: '≥ B2',
      gsCurrent:  f.language_level || '—', gsRequired:  '≥ B2',
    },
    {
      label: 'Hướng dẫn học viên',
      shortLabel: 'Hướng dẫn',
      pgs: status(sm >= 2 || sp >= 1, smF),
      gs:  status(sp >= 2, spF),
      pgsCurrent: smF ? `${sm} ThS, ${sp} NCS` : '—',
      pgsRequired: '≥ 2 ThS hoặc ≥ 1 NCS',
      gsCurrent: spF ? `${sp} NCS TS` : '—',
      gsRequired: '≥ 2 NCS TS',
      pgsPct: smF ? Math.max(pct(sm, 2), pct(sp, 1)) : undefined,
      gsPct:  spF ? pct(sp, 2) : undefined,
    },
    {
      label: 'Đề tài nghiên cứu',
      shortLabel: 'Đề tài',
      pgs: status(pi >= 2 || pm >= 1, projPF),
      gs:  status(pm >= 2 || pn >= 1, projGF),
      pgsCurrent: projPF ? `${pi} cơ sở, ${pm} Bộ` : '—',
      pgsRequired: '≥ 2 cơ sở hoặc ≥ 1 Bộ',
      gsCurrent: projGF ? `${pm} cấp Bộ, ${pn} QG` : '—',
      gsRequired: '≥ 2 cấp Bộ hoặc ≥ 1 QG',
    },
  ];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusIcon({ s }: { s: Status }) {
  if (s === 'met')   return <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />;
  if (s === 'unmet') return <XCircle      size={14} className="text-red-400     flex-shrink-0 mt-0.5" />;
  return                    <HelpCircle   size={14} className="text-slate-300   flex-shrink-0 mt-0.5" />;
}

function MiniBar({ pct: p, color }: { pct: number; color: 'amber' | 'indigo' }) {
  const bar = color === 'amber'
    ? (p >= 100 ? 'bg-amber-400' : 'bg-amber-300')
    : (p >= 100 ? 'bg-indigo-500' : 'bg-indigo-300');
  return (
    <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, p)}%` }} />
    </div>
  );
}

function SummaryHeader({
  title, met, total, color, qualified,
}: {
  title: string; met: number; total: number; color: 'amber' | 'indigo'; qualified: boolean;
}) {
  const p = Math.round((met / total) * 100);
  const bg   = qualified ? (color === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200') : 'bg-slate-50 border-slate-200';
  const text = qualified ? (color === 'amber' ? 'text-amber-800' : 'text-indigo-800') : 'text-slate-700';
  const bar  = color === 'amber' ? (qualified ? 'bg-amber-400' : 'bg-amber-300') : (qualified ? 'bg-indigo-500' : 'bg-indigo-300');
  return (
    <div className={`px-4 pt-3 pb-2.5 border-b ${bg}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-sm font-semibold ${text}`}>{title}</span>
        {qualified
          ? <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Đủ điều kiện ✓</span>
          : <span className="text-[11px] text-slate-400">{met}/{total} tiêu chí</span>
        }
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/70 rounded-full overflow-hidden border border-white">
          <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${p}%` }} />
        </div>
        <span className={`text-xs font-bold ${text}`}>{p}%</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function NumInput({ value, onChange, step = 1, placeholder = '0' }: {
  value: string; onChange: (v: string) => void; step?: number; placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      min={0}
      step={step}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
    />
  );
}

function InlineNum({ label, value, onChange, placeholder = '0' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 whitespace-nowrap">{label}</span>
      <input
        type="number" min={0} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-16 px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Simulator() {
  const { user } = useAuth();

  const [form, setForm] = useState<SimForm>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT, ...JSON.parse(saved) } : DEFAULT;
    } catch { return DEFAULT; }
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const set = (k: keyof SimForm) => (v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const loadFromProfile = async () => {
    setLoadingProfile(true);
    setProfileMsg(null);
    try {
      const data = await profileApi.get();
      if (!data.totals) {
        setProfileMsg({ ok: false, text: 'Hồ sơ chưa có dữ liệu điểm.' });
        return;
      }
      setForm(f => ({
        ...f,
        total_score:        String(data.totals!.total_score),
        score_3y:           String(data.totals!.score_3y),
        paper_score:        String(data.totals!.paper_score),
        first_author_count: String(data.totals!.first_author_count),
      }));
      setProfileMsg({ ok: true, text: `Đã lấy điểm từ hồ sơ (${data.author?.name ?? user?.username}).` });
    } catch {
      setProfileMsg({ ok: false, text: 'Không thể kết nối hồ sơ.' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const reset = () => { setForm(DEFAULT); setProfileMsg(null); };

  const criteria = compute(form);
  const pgsMet = criteria.filter(c => c.pgs === 'met').length;
  const gsMet  = criteria.filter(c => c.gs  === 'met').length;
  const pgsQualified = pgsMet === criteria.length;
  const gsQualified  = gsMet  === criteria.length;

  const LANG_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const LANG_OK = new Set(['B2', 'C1', 'C2', 'native']);

  return (
    <div className="flex gap-5 items-start max-w-6xl">

      {/* ── Left: Form ───────────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-4 min-w-0">

        {/* Header card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Gauge size={20} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Mô phỏng tiêu chí PGS / GS</h2>
                <p className="text-xs text-slate-500 mt-0.5">Điền thông tin để kiểm tra tiến độ đạt tiêu chuẩn. Dữ liệu lưu tự động trên trình duyệt.</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {user?.author_id && (
                <button
                  onClick={loadFromProfile}
                  disabled={loadingProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ArrowDownToLine size={13} />
                  {loadingProfile ? 'Đang lấy...' : 'Lấy điểm từ hồ sơ'}
                </button>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw size={13} />
                Đặt lại
              </button>
            </div>
          </div>
          {profileMsg && (
            <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${profileMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {profileMsg.text}
            </div>
          )}
        </div>

        {/* Section 1: Research scores */}
        <Section title="1. Điểm công trình khoa học">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Tổng điểm quy đổi" hint="PGS ≥ 10 · GS ≥ 20">
              <NumInput value={form.total_score} onChange={set('total_score')} step={0.1} placeholder="VD: 9.5" />
            </Field>
            <Field label="Điểm trong 3 năm cuối" hint="PGS ≥ 2.5 · GS ≥ 5.0">
              <NumInput value={form.score_3y} onChange={set('score_3y')} step={0.1} placeholder="VD: 4.2" />
            </Field>
            <Field label="Điểm từ bài báo khoa học" hint="Tạp chí quốc tế uy tín · PGS ≥ 6 · GS ≥ 12">
              <NumInput value={form.paper_score} onChange={set('paper_score')} step={0.1} placeholder="VD: 7.1" />
            </Field>
            <Field label="Bài báo tác giả chính (từ 2020)" hint="Tác giả đầu hoặc tác giả liên hệ · PGS ≥ 3 · GS ≥ 5">
              <NumInput value={form.first_author_count} onChange={set('first_author_count')} placeholder="VD: 4" />
            </Field>
          </div>
        </Section>

        {/* Section 2: Teaching & seniority */}
        <Section title="2. Giảng dạy & thâm niên công tác">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Giờ chuẩn giảng dạy trung bình / năm" hint="PGS & GS ≥ 275 giờ / năm">
              <NumInput value={form.teaching_hours} onChange={set('teaching_hours')} placeholder="VD: 300" />
            </Field>
            <Field label="Số năm công tác trong lĩnh vực" hint="PGS ≥ 6 năm · GS ≥ 9 năm">
              <NumInput value={form.years_in_field} onChange={set('years_in_field')} placeholder="VD: 8" />
            </Field>
          </div>
        </Section>

        {/* Section 3: Qualifications */}
        <Section title="3. Trình độ & chức danh">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox" checked={form.has_phd}
                  onChange={e => set('has_phd')(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-medium text-slate-700">Đã có bằng Tiến sĩ</span>
              </label>
              {form.has_phd && (
                <InlineNum label="Số năm từ khi nhận bằng TS:" value={form.years_since_phd} onChange={set('years_since_phd')} />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox" checked={form.is_pgs}
                  onChange={e => set('is_pgs')(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-medium text-slate-700">Đã có chức danh Phó Giáo sư</span>
              </label>
              {form.is_pgs && (
                <InlineNum label="Số năm từ khi được công nhận PGS:" value={form.years_as_pgs} onChange={set('years_as_pgs')} />
              )}
            </div>
          </div>
        </Section>

        {/* Section 4: Language */}
        <Section title="4. Trình độ ngoại ngữ">
          <Field label="Bậc năng lực ngoại ngữ (CEFR hoặc tương đương)" hint="PGS & GS yêu cầu tối thiểu B2">
            <div className="flex flex-wrap gap-2 mt-2">
              {LANG_LEVELS.map(lv => (
                <label key={lv} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio" name="language" value={lv}
                    checked={form.language_level === lv}
                    onChange={() => set('language_level')(lv)}
                    className="accent-indigo-600"
                  />
                  <span className={`text-sm px-2 py-0.5 rounded-full border transition-colors ${
                    form.language_level === lv
                      ? (LANG_OK.has(lv) ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'bg-red-50 border-red-200 text-red-600')
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                  }`}>{lv}</span>
                </label>
              ))}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio" name="language" value="native"
                  checked={form.language_level === 'native'}
                  onChange={() => set('language_level')('native')}
                  className="accent-indigo-600"
                />
                <span className={`text-sm px-2 py-0.5 rounded-full border transition-colors ${
                  form.language_level === 'native'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}>Bản ngữ</span>
              </label>
              {form.language_level && (
                <button onClick={() => set('language_level')('')} className="text-xs text-slate-400 hover:text-slate-600 underline">Xóa</button>
              )}
            </div>
          </Field>
        </Section>

        {/* Section 5: Supervision */}
        <Section title="5. Hướng dẫn học viên">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Học viên Thạc sĩ đã bảo vệ thành công" hint="PGS: ≥ 2 ThS (hoặc ≥ 1 NCS)">
              <NumInput value={form.supervised_masters} onChange={set('supervised_masters')} placeholder="0" />
            </Field>
            <Field label="Nghiên cứu sinh TS đã bảo vệ thành công" hint="PGS: ≥ 1 NCS · GS: ≥ 2 NCS TS">
              <NumInput value={form.supervised_phd} onChange={set('supervised_phd')} placeholder="0" />
            </Field>
          </div>
        </Section>

        {/* Section 6: Projects */}
        <Section title="6. Đề tài nghiên cứu khoa học (đã chủ trì)">
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Đề tài cấp cơ sở" hint="PGS: ≥ 2 cơ sở hoặc ≥ 1 cấp Bộ">
              <NumInput value={form.projects_institutional} onChange={set('projects_institutional')} placeholder="0" />
            </Field>
            <Field label="Đề tài cấp Bộ / Tỉnh" hint="GS: ≥ 2 cấp Bộ hoặc ≥ 1 cấp QG">
              <NumInput value={form.projects_ministry} onChange={set('projects_ministry')} placeholder="0" />
            </Field>
            <Field label="Đề tài cấp Quốc gia" hint="NAFOSTED, đề tài trọng điểm QG…">
              <NumInput value={form.projects_national} onChange={set('projects_national')} placeholder="0" />
            </Field>
          </div>
        </Section>

        <p className="text-xs text-slate-400 px-1 pb-2">
          * Kết quả mang tính tham khảo dựa trên Thông tư 02/2021/TT-BGDĐT và quy định hiện hành. Vui lòng tra cứu văn bản gốc để xác nhận.
        </p>
      </div>

      {/* ── Right: Result panel ───────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 space-y-3 sticky top-0 self-start">

        {/* PGS card */}
        <div className={`bg-white rounded-xl border overflow-hidden ${pgsQualified ? 'border-amber-300 shadow-sm shadow-amber-100' : 'border-slate-200'}`}>
          <SummaryHeader title="Phó Giáo sư (PGS)" met={pgsMet} total={criteria.length} color="amber" qualified={pgsQualified} />
          <div className="px-3 py-2 divide-y divide-slate-50">
            {criteria.map((c, i) => (
              <div key={i} className="flex items-start gap-2 py-2">
                <StatusIcon s={c.pgs} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-700 leading-snug">{c.shortLabel}</div>
                  {c.pgs !== 'empty' ? (
                    <>
                      <div className={`text-[11px] mt-0.5 ${c.pgs === 'met' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {c.pgsCurrent} <span className="text-slate-300">/</span> {c.pgsRequired}
                      </div>
                      {c.pgsPct !== undefined && c.pgs !== 'met' && (
                        <MiniBar pct={c.pgsPct} color="amber" />
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-300 mt-0.5">{c.pgsRequired}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GS card */}
        <div className={`bg-white rounded-xl border overflow-hidden ${gsQualified ? 'border-indigo-400 shadow-sm shadow-indigo-100' : 'border-slate-200'}`}>
          <SummaryHeader title="Giáo sư (GS)" met={gsMet} total={criteria.length} color="indigo" qualified={gsQualified} />
          <div className="px-3 py-2 divide-y divide-slate-50">
            {criteria.map((c, i) => (
              <div key={i} className="flex items-start gap-2 py-2">
                <StatusIcon s={c.gs} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-700 leading-snug">{c.shortLabel}</div>
                  {c.gs !== 'empty' ? (
                    <>
                      <div className={`text-[11px] mt-0.5 ${c.gs === 'met' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {c.gsCurrent} <span className="text-slate-300">/</span> {c.gsRequired}
                      </div>
                      {c.gsPct !== undefined && c.gs !== 'met' && (
                        <MiniBar pct={c.gsPct} color="indigo" />
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-300 mt-0.5">{c.gsRequired}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 px-1">
          ⬆ Dữ liệu lưu tự động. Ấn "Đặt lại" để xóa.
        </p>
      </div>
    </div>
  );
}
