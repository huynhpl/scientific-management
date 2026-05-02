import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, UserPlus } from 'lucide-react';
import { useAuth, type UserRole } from '../contexts/AuthContext';

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string }[] = [
  { value: 'member', label: 'Member', desc: 'Xem dữ liệu cá nhân' },
  { value: 'lead', label: 'Lead', desc: 'Xem dữ liệu bản thân + nhóm quản lý' },
  { value: 'admin', label: 'Admin', desc: 'Xem toàn bộ dữ liệu' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [authorId, setAuthorId] = useState<number | null>(null);
  const [authors, setAuthors] = useState<{ id: number; name: string; member_role: string; group_type: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/members')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAuthors(data); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp'); return; }
    setLoading(true);
    try {
      await register(username.trim(), password, role, authorId);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight">Research</div>
            <div className="text-xs text-slate-500 leading-tight">Paper Manager</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Đăng ký tài khoản</h1>
          <p className="text-sm text-slate-500 mb-6">Tạo tài khoản mới để sử dụng hệ thống</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Tối thiểu 3 ký tự"
                required
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Xác nhận password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Nhập lại password"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Vai trò</label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      role === opt.value
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={role === opt.value}
                      onChange={() => setRole(opt.value)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Link to author profile */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Liên kết thành viên <span className="text-slate-400 font-normal">(tuỳ chọn)</span>
              </label>
              <select
                value={authorId ?? ''}
                onChange={e => setAuthorId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">-- Không liên kết --</option>
                {authors.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.member_role})</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Liên kết để lọc dữ liệu publication theo tên bạn</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus size={16} />
              {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
