import { useState } from 'react';
import { Calculator, Scale, ListChecks, ChevronRight, Info } from 'lucide-react';

type Tab = 'scoring' | 'standards' | 'progress';

// ── Công thức tính điểm ──────────────────────────────────────────────────────

interface ScoreItem {
  label: string;
  points: string;
  note?: string;
  highlight?: boolean;
}

interface ScoreGroup {
  title: string;
  subtitle: string;
  color: string;
  badgeColor: string;
  items: ScoreItem[];
}

const SCORING_GROUPS: ScoreGroup[] = [
  {
    title: 'Bài báo quốc tế',
    subtitle: 'Có ISSN và ISI / SCIE / Scopus / ESCI',
    color: 'border-blue-200 bg-blue-50/40',
    badgeColor: 'bg-blue-100 text-blue-700',
    items: [
      { label: 'Q1', points: '2.0', note: 'Tác giả chính: 100% · Đồng tác giả: chia theo quy định', highlight: true },
      { label: 'Q2', points: '1.5' },
      { label: 'Q3', points: '1.25' },
      { label: 'Q4', points: '1.0' },
      { label: 'IF vượt trội', points: '+0.5 – 1.0', note: 'Cộng thêm 50% điểm quy đổi tối đa' },
    ],
  },
  {
    title: 'Bài báo quốc tế khác',
    subtitle: 'Có ISSN · Không thuộc ISI / Scopus',
    color: 'border-purple-200 bg-purple-50/40',
    badgeColor: 'bg-purple-100 text-purple-700',
    items: [
      { label: 'Xuất bản online', points: '1.0', note: 'Do HĐGS ngành quyết định' },
      { label: 'Không xuất bản online', points: '0.75' },
    ],
  },
  {
    title: 'Bài báo trong nước',
    subtitle: 'Tạp chí khoa học uy tín (danh mục HĐGSNN)',
    color: 'border-green-200 bg-green-50/40',
    badgeColor: 'bg-green-100 text-green-700',
    items: [
      { label: 'Tạp chí loại A', points: '1.0', note: 'Do HĐGS các ngành xác định' },
      { label: 'Tạp chí loại B', points: '0.5' },
    ],
  },
  {
    title: 'Kỷ yếu hội nghị',
    subtitle: 'Có phản biện · Xuất bản có mã số ISBN',
    color: 'border-amber-200 bg-amber-50/40',
    badgeColor: 'bg-amber-100 text-amber-700',
    items: [
      { label: 'Quốc tế uy tín (Scopus/WoS)', points: '1.0' },
      { label: 'Quốc tế chuyên ngành', points: '0.75' },
      { label: 'Quốc tế nhỏ', points: '0.5' },
      { label: 'Trong nước cấp Bộ/trường trọng điểm', points: '0.5' },
      { label: 'Trong nước cấp trường', points: '0.4' },
      { label: 'Trong nước cấp khoa', points: '0.3' },
    ],
  },
  {
    title: 'Sách phục vụ đào tạo',
    subtitle: 'Xuất bản trong nước hoặc quốc tế',
    color: 'border-slate-200 bg-slate-50/40',
    badgeColor: 'bg-slate-100 text-slate-600',
    items: [
      { label: 'Sách chuyên khảo', points: '3.0', note: 'Tác giả chính, có phản biện' },
      { label: 'Giáo trình (ĐH, sau ĐH)', points: '2.0' },
      { label: 'Sách tham khảo', points: '1.5' },
      { label: 'Sách hướng dẫn / từ điển', points: '1.0' },
      { label: 'Chương sách (NXB quốc tế uy tín)', points: '1.0' },
      { label: 'Cộng thêm NXB quốc tế', points: '+0.25 – 0.75', note: 'Cộng thêm 25% điểm công trình gốc' },
    ],
  },
  {
    title: 'Kết quả ứng dụng KH&CN',
    subtitle: 'Cục SHTT cấp',
    color: 'border-rose-200 bg-rose-50/40',
    badgeColor: 'bg-rose-100 text-rose-700',
    items: [
      { label: 'Bằng độc quyền sáng chế', points: '3.0', note: 'Tùy mức độ bảo hộ' },
      { label: 'Giải pháp hữu ích', points: '2.0' },
    ],
  },
  {
    title: 'Tác phẩm nghệ thuật / TDTT',
    subtitle: 'Giải thưởng đạt cấp',
    color: 'border-orange-200 bg-orange-50/40',
    badgeColor: 'bg-orange-100 text-orange-700',
    items: [
      { label: 'Giải quốc tế', points: '1.5' },
      { label: 'Giải quốc gia', points: '1.0' },
    ],
  },
];

const POINTS_LABEL: Record<string, string> = {
  '2.0': 'bg-emerald-100 text-emerald-700',
  '1.5': 'bg-blue-100 text-blue-700',
  '1.25': 'bg-amber-100 text-amber-700',
  '1.0': 'bg-orange-100 text-orange-700',
};

// ── Tiêu chuẩn so sánh ───────────────────────────────────────────────────────

interface Standard {
  criteria: string;
  pgs: string;
  gs: string;
}

const STANDARDS: Standard[] = [
  {
    criteria: 'Thời gian công tác',
    pgs: '≥ 6 năm (3 năm cuối liên tiếp)',
    gs: '≥ 9 năm, trong đó ≥ 3 năm sau khi được bổ nhiệm PGS',
  },
  {
    criteria: 'Bằng cấp học thuật',
    pgs: '≥ 3 năm kể từ ngày có bằng Tiến sĩ',
    gs: '≥ 3 năm kể từ ngày được bổ nhiệm PGS',
  },
  {
    criteria: 'Giờ giảng chuẩn',
    pgs: '≥ 275 giờ / năm (≥ 50% trực tiếp lên lớp)',
    gs: '≥ 275 giờ / năm (≥ 50% trực tiếp lên lớp)',
  },
  {
    criteria: 'Ngoại ngữ',
    pgs: 'Bậc 4/6 · IELTS ≥ 5.5 · TOEIC ≥ 701 · VSTEP/APTIS B2',
    gs: 'Bậc 4/6 · IELTS ≥ 5.5 · TOEIC ≥ 701 · VSTEP/APTIS B2',
  },
  {
    criteria: 'Tổng điểm công trình KH',
    pgs: '≥ 10 điểm\n(≥ 2.5 điểm trong 3 năm cuối)',
    gs: '≥ 20 điểm\n(≥ 5.0 điểm trong 3 năm cuối)',
  },
  {
    criteria: 'Điểm bài báo KH\n(KHTN · KT · CN · Y Dược)',
    pgs: '≥ 6.0 điểm từ bài báo KH, bằng sáng chế, giải pháp hữu ích',
    gs: '≥ 12.0 điểm từ bài báo KH, bằng sáng chế, giải pháp hữu ích',
  },
  {
    criteria: 'Điểm bài báo KH\n(KHXH · NV · NT · TDTT)',
    pgs: '≥ 4.0 điểm từ bài báo KH, giải pháp hữu ích, tác phẩm nghệ thuật, thành tích thể thao',
    gs: '≥ 8.0 điểm từ bài báo KH, giải pháp hữu ích, tác phẩm nghệ thuật, thành tích thể thao',
  },
  {
    criteria: 'Điểm sách đào tạo\n(KHTN · KT · CN · Y Dược)',
    pgs: '—',
    gs: '≥ 3.0 điểm, trong đó ≥ 1.5 điểm từ giáo trình hoặc sách chuyên khảo',
  },
  {
    criteria: 'Điểm sách đào tạo\n(KHXH · NT · TDTT)',
    pgs: '—',
    gs: '≥ 5.0 điểm, trong đó ≥ 2.5 điểm từ giáo trình hoặc sách chuyên khảo',
  },
  {
    criteria: 'Công trình chính\n(tác giả chính)',
    pgs: 'Trước 2020: ≥ 2 CTKH\nTừ 2020: ≥ 3 CTKH\n(Có thể thay 1 bằng 1 chương sách/sách chuyên khảo)',
    gs: 'Trước 2020: ≥ 3 CTKH\nTừ 2020: ≥ 5 CTKH\n(Có thể thay 2 bằng chương sách/sách chuyên khảo)',
  },
  {
    criteria: 'Hướng dẫn học viên / NCS',
    pgs: '≥ 2 học viên Thạc sĩ hoặc ≥ 1 NCS Tiến sĩ đã bảo vệ thành công\n(Thiếu: 1 HV ThS = 1 CTKH)',
    gs: '≥ 2 NCS Tiến sĩ đã bảo vệ thành công\n(Thiếu: 1 NCS = 3 CTKH)',
  },
  {
    criteria: 'Chủ trì nhiệm vụ KH',
    pgs: '≥ 2 cấp Cơ Sở hoặc ≥ 1 cấp Bộ\n(Thiếu: thay bằng 1 CTKH)',
    gs: '≥ 2 cấp Bộ hoặc ≥ 1 cấp Quốc Gia\n(Thiếu: thay bằng CTKH tương ứng)',
  },
];

// ── Tiến trình checklist ─────────────────────────────────────────────────────

interface CheckItem {
  label: string;
  requirement: string;
  group?: string;
}

const PGS_ITEMS: CheckItem[] = [
  { label: 'Đạo đức', requirement: 'Không kỷ luật từ khiển trách trở lên, không vi phạm đạo đức nhà giáo' },
  { label: 'Giờ giảng', requirement: '≥ 275 giờ chuẩn / năm (≥ 50% trực tiếp lên lớp)' },
  { label: 'Thời gian công tác', requirement: '≥ 6 năm, trong đó 3 năm cuối liên tiếp giảng dạy ĐH trở lên' },
  { label: 'Ngoại ngữ', requirement: 'Bậc 4/6 · IELTS ≥ 5.5 · TOEIC ≥ 701' },
  { label: 'Bằng Tiến sĩ', requirement: '≥ 3 năm (tính đến hạn nộp hồ sơ)' },
  { label: 'Tác giả chính (trước 2020)', requirement: '≥ 2 CTKH hoặc ≥ 1 CTKH + 1 chương sách / sách chuyên khảo', group: 'Nghiên cứu' },
  { label: 'Tác giả chính (từ 2020)', requirement: '≥ 3 CTKH hoặc ≥ 2 CTKH + 1 chương sách / sách chuyên khảo', group: 'Nghiên cứu' },
  { label: 'Chủ trì nhiệm vụ KH', requirement: '≥ 2 cấp Cơ Sở hoặc ≥ 1 cấp Bộ', group: 'Nghiên cứu' },
  { label: 'Hướng dẫn', requirement: '≥ 2 HV ThS đã bảo vệ hoặc ≥ 1 NCS TS (Thiếu: 1 HV ThS = 1 CTKH)', group: 'Nghiên cứu' },
  { label: 'Tổng điểm công trình KH', requirement: '≥ 10 điểm', group: 'Điểm' },
  { label: 'Điểm 3 năm cuối', requirement: '≥ 2.5 điểm', group: 'Điểm' },
  { label: 'KHTN/KT/CN/YD — Bài báo KH', requirement: '≥ 6.0 điểm từ bài báo, sáng chế, giải pháp hữu ích', group: 'Điểm' },
  { label: 'KHXH/NV/NT/TT — Bài báo KH', requirement: '≥ 4.0 điểm từ bài báo, giải pháp hữu ích, tác phẩm NT, thành tích thể thao', group: 'Điểm' },
];

const GS_ITEMS: CheckItem[] = [
  { label: 'Đạo đức', requirement: 'Không kỷ luật từ khiển trách trở lên, không vi phạm đạo đức nhà giáo' },
  { label: 'Giờ giảng', requirement: '≥ 275 giờ chuẩn / năm (≥ 50% trực tiếp lên lớp)' },
  { label: 'Thời gian công tác', requirement: '≥ 9 năm, trong đó ≥ 3 năm sau khi được bổ nhiệm PGS' },
  { label: 'Ngoại ngữ', requirement: 'Bậc 4/6 · IELTS ≥ 5.5 · TOEIC ≥ 701' },
  { label: 'Được bổ nhiệm PGS', requirement: '≥ 3 năm (tính đến hạn nộp hồ sơ)' },
  { label: 'Tác giả chính (trước 2020)', requirement: '≥ 3 CTKH hoặc ≥ 2 CTKH + 1 chương sách / sách chuyên khảo', group: 'Nghiên cứu' },
  { label: 'Tác giả chính (từ 2020)', requirement: '≥ 5 CTKH hoặc ≥ 3 CTKH + 2 chương sách / sách chuyên khảo', group: 'Nghiên cứu' },
  { label: 'Chủ trì nhiệm vụ KH', requirement: '≥ 2 cấp Bộ hoặc ≥ 1 cấp Quốc Gia', group: 'Nghiên cứu' },
  { label: 'Hướng dẫn NCS', requirement: '≥ 2 NCS TS đã bảo vệ thành công (Thiếu: 1 NCS = 3 CTKH)', group: 'Nghiên cứu' },
  { label: 'Tổng điểm công trình KH', requirement: '≥ 20 điểm', group: 'Điểm' },
  { label: 'Điểm 3 năm cuối', requirement: '≥ 5.0 điểm', group: 'Điểm' },
  { label: 'KHTN/KT/CN/YD — Bài báo KH', requirement: '≥ 12.0 điểm từ bài báo, sáng chế, giải pháp hữu ích', group: 'Điểm' },
  { label: 'KHXH/NV/NT/TT — Bài báo KH', requirement: '≥ 8.0 điểm từ bài báo, giải pháp hữu ích, tác phẩm NT, thành tích thể thao', group: 'Điểm' },
  { label: 'KHTN/KT/CN/YD — Sách đào tạo', requirement: '≥ 3.0 điểm (≥ 1.5 từ giáo trình / sách chuyên khảo)', group: 'Điểm' },
  { label: 'KHXH/NT/TT — Sách đào tạo', requirement: '≥ 5.0 điểm (≥ 2.5 từ giáo trình / sách chuyên khảo)', group: 'Điểm' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function InfoPage() {
  const [tab, setTab] = useState<Tab>('scoring');
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setChecks(c => ({ ...c, [key]: !c[key] }));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'scoring', label: 'Công thức tính điểm', icon: <Calculator size={15} /> },
    { id: 'standards', label: 'Tiêu chuẩn GS / PGS', icon: <Scale size={15} /> },
    { id: 'progress', label: 'Tiến trình', icon: <ListChecks size={15} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-900">Thông tin hữu ích</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Tiêu chuẩn xét chức danh GS / PGS và công thức quy đổi điểm công trình khoa học
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Scoring tab ── */}
      {tab === 'scoring' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {SCORING_GROUPS.map(group => (
              <div key={group.title} className={`border rounded-xl overflow-hidden ${group.color}`}>
                <div className="px-4 py-3 border-b border-inherit">
                  <div className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${group.badgeColor}`}>
                    {group.title}
                  </div>
                  <p className="text-xs text-slate-500">{group.subtitle}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map(item => (
                    <div key={item.label} className="flex items-start justify-between gap-3 px-4 py-2.5 bg-white/70">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                        {item.note && (
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{item.note}</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 text-sm font-bold px-2.5 py-0.5 rounded-lg ${POINTS_LABEL[item.points] || 'bg-slate-100 text-slate-600'}`}>
                        {item.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Author scoring rule */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-sm text-indigo-800">
                <p className="font-semibold">Cách tính điểm theo vai trò tác giả</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  {[
                    { label: 'Tác giả chính', rule: '1/3 tổng điểm công trình', sub: 'Phần còn lại chia đều cho tất cả tác giả (kể cả tác giả chính)' },
                    { label: 'Đồng tác giả', rule: 'Chia đều phần còn lại', sub: 'Sau khi trừ phần của tác giả chính' },
                    { label: 'Không rõ tác giả chính', rule: 'Chia đều cho tất cả', sub: 'Không phân biệt thứ tự' },
                  ].map(r => (
                    <div key={r.label} className="bg-white/60 rounded-lg px-3 py-2.5">
                      <p className="text-xs font-semibold text-indigo-700">{r.label}</p>
                      <p className="text-sm font-medium text-indigo-900 mt-0.5">{r.rule}</p>
                      <p className="text-xs text-indigo-500 mt-0.5">{r.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legal note */}
          <p className="text-xs text-slate-400 px-1">
            Căn cứ: Quyết định 37/2018/QĐ-TTg và sửa đổi 25/2020/QĐ-TTg. Áp dụng chuẩn mới từ ngày 01/01/2020.
          </p>
        </div>
      )}

      {/* ── Standards tab ── */}
      {tab === 'standards' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 text-left font-medium w-52">Tiêu chí</th>
                  <th className="px-5 py-3 text-left font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      Phó Giáo Sư (PGS)
                    </span>
                  </th>
                  <th className="px-5 py-3 text-left font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                      Giáo Sư (GS)
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STANDARDS.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-700 align-top whitespace-pre-line text-xs">{s.criteria}</td>
                    <td className="px-5 py-3 text-slate-600 align-top whitespace-pre-line">{s.pgs}</td>
                    <td className="px-5 py-3 text-slate-800 font-medium align-top whitespace-pre-line">{s.gs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 space-y-1.5 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Lưu ý chung</p>
            <p><ChevronRight size={12} className="inline mr-1" />Bài báo khoa học phải công bố trên tạp chí quốc tế uy tín (ISI/Scopus) mới được tính để xét tiêu chuẩn GS/PGS.</p>
            <p><ChevronRight size={12} className="inline mr-1" />Ngành KH quân sự / KH an ninh được thay bằng bài báo trên tạp chí uy tín của ngành (bài báo thay thế — tổng ≥ 1.5 điểm).</p>
            <p><ChevronRight size={12} className="inline mr-1" />Nếu thiếu giờ giảng hoặc chưa đủ thời gian công tác: cần có ≥ 2 lần điểm công trình KH quy đổi tối thiểu.</p>
            <p><ChevronRight size={12} className="inline mr-1" />Công trình trùng lặp &gt; 30% không được tính điểm.</p>
          </div>
        </div>
      )}

      {/* ── Progress tab ── */}
      {tab === 'progress' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[
            { title: 'Tiến trình Phó Giáo Sư (PGS)', color: 'amber', items: PGS_ITEMS, prefix: 'pgs' },
            { title: 'Tiến trình Giáo Sư (GS)', color: 'indigo', items: GS_ITEMS, prefix: 'gs' },
          ].map(col => {
            const done = col.items.filter((_, i) => checks[`${col.prefix}-${i}`]).length;
            const pct = Math.round((done / col.items.length) * 100);
            const groups = [...new Set(col.items.map(it => it.group).filter(Boolean))] as string[];

            return (
              <div key={col.prefix} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div className={`px-5 py-4 border-b border-slate-200 ${col.color === 'amber' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                  <h3 className={`font-semibold text-sm ${col.color === 'amber' ? 'text-amber-800' : 'text-indigo-800'}`}>
                    {col.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${col.color === 'amber' ? 'bg-amber-400' : 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${col.color === 'amber' ? 'text-amber-700' : 'text-indigo-700'}`}>
                      {done}/{col.items.length} ({pct}%)
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-100">
                  {col.items.map((item, idx) => {
                    const key = `${col.prefix}-${idx}`;
                    const checked = !!checks[key];
                    const isGroupHeader = idx === 0 || item.group !== col.items[idx - 1]?.group;

                    return (
                      <div key={idx}>
                        {isGroupHeader && item.group && (
                          <div className="px-5 py-1.5 bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            {item.group}
                          </div>
                        )}
                        <button
                          className={`w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors ${checked ? 'opacity-60' : ''}`}
                          onClick={() => toggle(key)}
                        >
                          <div className={`flex-shrink-0 mt-0.5 ${checked ? (col.color === 'amber' ? 'text-amber-500' : 'text-indigo-500') : 'text-slate-300'}`}>
                            {checked
                              ? <div className={`w-5 h-5 rounded-full flex items-center justify-center ${col.color === 'amber' ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </div>
                              : <div className="w-5 h-5 rounded-full border-2 border-slate-200" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {item.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.requirement}</p>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Reset */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
                  <button
                    onClick={() => {
                      const newChecks = { ...checks };
                      col.items.forEach((_, i) => delete newChecks[`${col.prefix}-${i}`]);
                      setChecks(newChecks);
                    }}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Đặt lại tất cả
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
