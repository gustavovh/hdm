import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PresupuestoDetail } from './pages/PresupuestoDetail';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { LogOut, FileText, Users } from 'lucide-react';

function AuthenticatedApp() {
  const { user, signOut, isAdmin, isVendedor } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'presupuesto'>(
    'dashboard'
  );
  const [selectedPresupuestoId] = useState<string>('');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  HDM - Sistema de Presupuestos
                </h1>
                <p className="text-sm text-gray-600">
                  Gestión de Solicitudes de Descuento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right mr-4">
                <p className="text-sm font-medium text-gray-900">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-600">
                  {isAdmin ? 'Administrador' : 'Vendedor'}
                </p>
              </div>

              <NotificationCenter />

              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-2 mt-4 border-t border-gray-200 pt-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Panel de Aprobación
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="py-8">
        {isAdmin && currentView === 'dashboard' && <AdminDashboard />}
        {currentView === 'presupuesto' && selectedPresupuestoId && (
          <PresupuestoDetail presupuestoId={selectedPresupuestoId} />
        )}
        {isVendedor && (
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Bienvenido al Sistema de Presupuestos
              </h2>
              <p className="text-gray-600 mb-6">
                Aquí podrás gestionar tus presupuestos y solicitudes de descuento
              </p>
              <p className="text-sm text-gray-500">
                La interfaz completa de vendedor se puede implementar según los
                requisitos específicos
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema HDM
          </h1>
          <p className="text-gray-600">Gestión de Presupuestos y Descuentos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@hdm.com"
            required
          />

          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Iniciar Sesión
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 font-medium mb-2">
            Usuarios de prueba:
          </p>
          <p className="text-xs text-blue-700">
            Admin: admin@hdm.com
            <br />
            Vendedor: vendedor1@hdm.com
          </p>
          <p className="text-xs text-blue-600 mt-2">
            (Configura las contraseñas en Supabase Auth)
          </p>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <LoginForm />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
