import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Building2, BookOpen, UsersRound, LogOut, ChevronDown, Library, Info, UserCircle, Gauge } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/papers', icon: FileText, label: 'Bài báo' },
  { to: '/teams', icon: UsersRound, label: 'Nhóm & KPI' },
  { to: '/authors', icon: Users, label: 'Thành viên' },
  { to: '/venues', icon: Building2, label: 'Tạp chí / HN' },
  { to: '/journal-catalog', icon: Library, label: 'Danh mục HĐGSNN' },
  { to: '/profile',   icon: UserCircle, label: 'Hồ sơ của tôi' },
  { to: '/simulator', icon: Gauge,      label: 'Mô phỏng PGS/GS' },
  { to: '/info',      icon: Info,       label: 'Thông tin hữu ích' },
];

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', lead: 'Lead', member: 'Member' };
const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  lead: 'bg-amber-100 text-amber-700',
  member: 'bg-green-100 text-green-700',
};

export default function Layout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const pageTitle = nav.find(n => loc.pathname.startsWith(n.to))?.label ?? 'Chi tiết';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.username.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-tight">Research</div>
            <div className="text-xs text-slate-500 leading-tight">Paper Manager</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-3 border-t border-slate-200">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{user?.username}</div>
                {user?.author?.name && (
                  <div className="text-xs text-slate-400 truncate">{user.author.name}</div>
                )}
              </div>
              <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">Vai trò</div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOR[user?.role ?? 'member']}`}>
                    {ROLE_LABEL[user?.role ?? 'member']}
                  </span>
                  {user?.author && (
                    <div className="text-xs text-slate-500 mt-1">
                      {user.author.member_role} · {user.author.group_type}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
          {user && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLOR[user.role]}`}>
              {ROLE_LABEL[user.role]}
              {user.author?.name ? ` · ${user.author.name}` : ''}
            </span>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
