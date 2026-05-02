import type { Paper, Author, Venue, Stats, Team, TeamDetail, JournalCatalog, JournalCatalogPage } from '../types';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new Error('Phiên đăng nhập hết hạn');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const papersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Paper[]>(`/papers${qs}`);
  },
  get: (id: number) => request<Paper>(`/papers/${id}`),
  create: (data: Record<string, unknown>) =>
    request<{ id: number }>('/papers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    request<{ success: boolean }>(`/papers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ success: boolean }>(`/papers/${id}`, { method: 'DELETE' }),
  addActivity: (id: number, details: string) =>
    request<{ success: boolean }>(`/papers/${id}/activity`, { method: 'POST', body: JSON.stringify({ details }) }),
};

export const authorsApi = {
  list: () => request<Author[]>('/authors'),
  get: (id: number) => request<Author & { papers: Paper[] }>(`/authors/${id}`),
  create: (data: Record<string, unknown>) => request<{ id: number }>('/authors', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) => request<{ success: boolean }>(`/authors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ success: boolean }>(`/authors/${id}`, { method: 'DELETE' }),
};

export const venuesApi = {
  list: () => request<Venue[]>('/venues'),
  create: (data: Record<string, unknown>) => request<{ id: number }>('/venues', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) => request<{ success: boolean }>(`/venues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ success: boolean }>(`/venues/${id}`, { method: 'DELETE' }),
};

export const statsApi = {
  overview: () => request<Stats & { scope: 'all' | 'team' | 'personal' }>('/stats/overview'),
};

export const teamsApi = {
  list: () => request<Team[]>('/teams'),
  get: (id: number) => request<TeamDetail>(`/teams/${id}`),
  create: (data: Record<string, unknown>) => request<{ id: number }>('/teams', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) => request<{ success: boolean }>(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ success: boolean }>(`/teams/${id}`, { method: 'DELETE' }),
  addMember: (teamId: number, author_id: number, kpi_papers: number) =>
    request<{ success: boolean }>(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ author_id, kpi_papers }) }),
  updateMember: (teamId: number, authorId: number, kpi_papers: number) =>
    request<{ success: boolean }>(`/teams/${teamId}/members/${authorId}`, { method: 'PUT', body: JSON.stringify({ kpi_papers }) }),
  removeMember: (teamId: number, authorId: number) =>
    request<{ success: boolean }>(`/teams/${teamId}/members/${authorId}`, { method: 'DELETE' }),
};

export const journalCatalogApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<JournalCatalogPage>(`/journals${qs}`);
  },
  get: (id: number) => request<JournalCatalog>(`/journals/${id}`),
  fields: (list_type?: string) => {
    const qs = list_type ? `?list_type=${list_type}` : '';
    return request<string[]>(`/journals/fields${qs}`);
  },
  create: (data: Record<string, unknown>) =>
    request<{ id: number }>('/journals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    request<{ success: boolean }>(`/journals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ success: boolean }>(`/journals/${id}`, { method: 'DELETE' }),
  import: () => request<{ success: boolean; inserted: number; after_dedup: number; deleted_duplicates: number }>('/journals/import', { method: 'POST' }),
  dedup: () => request<{ success: boolean; remaining: number; deleted: number }>('/journals/dedup', { method: 'POST' }),
};

export const authApi = {
  users: () => request<{ id: number; username: string; role: string; author_id: number | null; created_at: string; author_name: string | null }[]>('/auth/users'),
};

export interface ProfilePaper {
  id: number; title: string; type: string; status: string;
  role: string; author_count: number;
  venue_name?: string; venue_abbr?: string; venue_type?: string;
  venue_ranking?: string; impact_factor?: number;
  submission_date?: string; decision_date?: string; publication_date?: string; date?: string;
  base_score: number; score_label: string; user_score: number;
  countable: boolean; recent_3y: boolean;
  category: 'bai_bao' | 'hoi_nghi' | 'other';
}
export interface ProfileTotals {
  total_score: number; score_3y: number;
  paper_score: number; paper_score_3y: number; conf_score: number;
  first_author_count: number; total_accepted: number; total_papers: number;
  by_year: { year: number | string; count: number; score: number }[];
}
export interface ProfileData {
  author: import('../types').Author | null;
  papers: ProfilePaper[];
  totals: ProfileTotals | null;
}
export const profileApi = {
  get: () => request<ProfileData>('/profile'),
};

export function uploadFile(paperId: number, file: File, fileType: string) {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  form.append('file_type', fileType);
  return fetch(`${BASE}/files/upload/${paperId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  }).then(r => r.json());
}

export function deleteFile(fileId: number) {
  return request(`/files/${fileId}`, { method: 'DELETE' });
}

export function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN');
}

export function daysUntil(d?: string | null): number | null {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function deadlineClass(days: number | null) {
  if (days === null) return '';
  if (days < 0) return 'text-red-500';
  if (days <= 7) return 'text-red-600 font-semibold';
  if (days <= 14) return 'text-orange-600 font-medium';
  if (days <= 30) return 'text-amber-600';
  return 'text-slate-500';
}
