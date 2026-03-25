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
import { Homepage } from './pages/Homepage.tsx';

function RootRoute() {
  const { user, isReady } = useAuth();

  if (!isReady) return null;
  if (!user) return <Homepage />;

  switch (user.role) {
    case 'SALES':         return <Navigate to="/billing" replace />;
    case 'STOCK_MANAGER': return <Navigate to="/transfers" replace />;
    case 'ACCOUNTS':      return <Navigate to="/audit" replace />;
    case 'ADMIN':         return <Navigate to="/dashboard" replace />;
    default:              return <Navigate to="/inventory" replace />;
  }
}


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRoute />} />
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
            <Route path="dashboard" element={<ProtectedRoute roles={['ADMIN', 'ACCOUNTS']}><Reports/></ProtectedRoute>} />
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
