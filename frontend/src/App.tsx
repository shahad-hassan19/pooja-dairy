import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.tsx';
import { ShopProvider } from './contexts/ShopContext.tsx';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Shops } from './pages/Shops';
import { Users } from './pages/Users';
import { Inventory } from './pages/Inventory';
import { Billing } from './pages/Billing';
import { Transfers } from './pages/Transfers';
import { Reports } from './pages/Reports';
import { Audit } from './pages/Audit';
import { useAuth } from './auth/useAuth.ts';

function IndexRoute() {
  const { user, isReady } = useAuth();

  if (!isReady) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'SALES') return <Billing />;

  return <Reports />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ShopProvider>
                  <Layout />
                </ShopProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<IndexRoute />} />
            <Route path="shops" element={<ProtectedRoute roles={['ADMIN']}><Shops /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute roles={['ADMIN']}><Users /></ProtectedRoute>} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="billing" element={<ProtectedRoute roles={['SALES', 'ADMIN']}><Billing /></ProtectedRoute>} />
            <Route path="transfers" element={<ProtectedRoute roles={['STOCK_MANAGER', 'ADMIN']}><Transfers /></ProtectedRoute>} />
            <Route path="audit" element={<ProtectedRoute roles={['ACCOUNTS', 'ADMIN']}><Audit /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
