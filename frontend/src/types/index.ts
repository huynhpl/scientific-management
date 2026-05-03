export type PaperStatus =
  | 'draft' | 'submitted' | 'under_review'
  | 'major_revision' | 'minor_revision'
  | 'accepted' | 'rejected' | 'published' | 'withdrawn';

export type PaperType = 'journal' | 'conference' | 'workshop' | 'preprint';

export type AuthorRole = 'first' | 'corresponding' | 'co-author';

export type MemberGroup = 'Data' | 'AI' | 'Khác';
export type MemberRole = 'Lead' | 'SubLead' | 'SV';

export interface Venue {
  id: number;
  name: string;
  abbreviation: string;
  type: 'journal' | 'conference';
  url?: string;
  impact_factor?: number;
  sjr_score?: number;
  ranking?: string;
  deadline?: string;
  location?: string;
  created_at: string;
}

export interface Author {
  id: number;
  name: string;
  email?: string;
  affiliation?: string;
  is_member: number;
  group_type: MemberGroup;
  member_role: MemberRole;
  created_at: string;
}

export interface PaperAuthor {
  id: number;
  name: string;
  email?: string;
  affiliation?: string;
  role: AuthorRole;
  order_index: number;
}

export interface PaperFile {
  id: number;
  paper_id: number;
  filename: string;
  original_name: string;
  file_type: string;
  size: number;
  uploaded_at: string;
}

export interface ActivityLog {
  id: number;
  paper_id: number;
  action: string;
  details: string;
  created_at: string;
}

export interface Paper {
  id: number;
  title: string;
  abstract?: string;
  type: PaperType;
  venue_id?: number;
  venue?: Venue | null;
  status: PaperStatus;
  authors: PaperAuthor[];
  submission_date?: string;
  decision_date?: string;
  publication_date?: string;
  submission_deadline?: string;
  revision_deadline?: string;
  doi?: string;
  arxiv_url?: string;
  paper_url?: string;
  openreview_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  files?: PaperFile[];
  activity?: ActivityLog[];
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  kpi_papers_per_year: number;
  created_at: string;
  member_count?: number;
  achieved?: number;
  in_progress?: number;
}

export interface TeamMember {
  id: number;
  name: string;
  email?: string;
  affiliation?: string;
  kpi_papers: number;
  achieved: number;
  in_progress: number;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

export interface Stats {
  total: number;
  underReview: number;
  acceptedThisYear: number;
  publishedThisYear: number;
  draftCount: number;
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  byAuthor: { id: number; name: string; total: number; accepted: number }[];
  deadlines: { id: number; title: string; status: string; submission_deadline?: string; revision_deadline?: string; venue_abbreviation?: string }[];
  byVenue: { name: string; abbreviation: string; type: string; count: number }[];
  byTeam: { id: number; name: string; kpi: number; achieved: number }[];
}

export const STATUS_LABEL: Record<PaperStatus, string> = {
  draft: 'Bản thảo',
  submitted: 'Đã nộp',
  under_review: 'Đang phản biện',
  major_revision: 'Sửa lớn',
  minor_revision: 'Sửa nhỏ',
  accepted: 'Chấp nhận',
  rejected: 'Từ chối',
  published: 'Đã xuất bản',
  withdrawn: 'Rút bài',
};

export const STATUS_COLOR: Record<PaperStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  major_revision: 'bg-orange-100 text-orange-700',
  minor_revision: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  published: 'bg-purple-100 text-purple-700',
  withdrawn: 'bg-gray-100 text-gray-500',
};

export const TYPE_LABEL: Record<PaperType, string> = {
  journal: 'Tạp chí',
  conference: 'Hội nghị',
  workshop: 'Workshop',
  preprint: 'Preprint',
};

export const ROLE_LABEL: Record<AuthorRole, string> = {
  first: 'Tác giả đầu',
  corresponding: 'Tác giả liên hệ',
  'co-author': 'Đồng tác giả',
};

export const MEMBER_GROUP_OPTIONS: MemberGroup[] = ['AI', 'Data', 'Khác'];
export const MEMBER_ROLE_OPTIONS: MemberRole[] = ['Lead', 'SubLead', 'SV'];

export const MEMBER_GROUP_COLOR: Record<MemberGroup, string> = {
  AI: 'bg-violet-100 text-violet-700',
  Data: 'bg-cyan-100 text-cyan-700',
  Khác: 'bg-slate-100 text-slate-600',
};

export const MEMBER_ROLE_COLOR: Record<MemberRole, string> = {
  Lead: 'bg-amber-100 text-amber-700',
  SubLead: 'bg-orange-100 text-orange-700',
  SV: 'bg-green-100 text-green-700',
};

export type JournalListType = 'quoc_gia' | 'isi' | 'quoc_te' | 'draft_quoc_te';

export interface JournalCatalog {
  id: number;
  name: string;
  issn?: string;
  eissn?: string;
  list_type: JournalListType;
  sources?: string;
  type?: string;
  organization?: string;
  points?: string;
  field?: string;
  url?: string;
  quartile?: string;
  sjr_score?: string;
  jcr_score?: string;
  h_index?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalCatalogPage {
  data: JournalCatalog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const JOURNAL_LIST_TYPE_LABEL: Record<JournalListType, string> = {
  quoc_gia: 'Quốc gia',
  isi: 'ISI',
  quoc_te: 'Quốc tế',
  draft_quoc_te: 'Quốc tế (Draft)',
};

export const JOURNAL_LIST_TYPE_COLOR: Record<JournalListType, string> = {
  quoc_gia: 'bg-green-100 text-green-700',
  isi: 'bg-blue-100 text-blue-700',
  quoc_te: 'bg-purple-100 text-purple-700',
  draft_quoc_te: 'bg-slate-100 text-slate-600',
};

export const QUARTILE_COLOR: Record<string, string> = {
  Q1: 'bg-emerald-100 text-emerald-700',
  Q2: 'bg-blue-100 text-blue-700',
  Q3: 'bg-amber-100 text-amber-700',
  Q4: 'bg-orange-100 text-orange-700',
};
