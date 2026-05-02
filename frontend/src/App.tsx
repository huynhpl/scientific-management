import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Papers from './pages/Papers';
import PaperDetail from './pages/PaperDetail';
import Authors from './pages/Authors';
import Venues from './pages/Venues';
import Teams from './pages/Teams';
import JournalCatalog from './pages/JournalCatalog';
import Info from './pages/Info';
import Profile from './pages/Profile';
import Simulator from './pages/Simulator';
import Login from './pages/Login';
import Register from './pages/Register';

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Đang tải...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

      {user ? (
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/papers" element={<Papers />} />
          <Route path="/papers/:id" element={<PaperDetail />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/journal-catalog" element={<JournalCatalog />} />
          <Route path="/info" element={<Info />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
