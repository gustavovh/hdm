import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PresupuestoDetail } from './pages/PresupuestoDetail';
import { PresupuestoList } from './components/presupuestos/PresupuestoList';
import { PresupuestoForm } from './components/presupuestos/PresupuestoForm';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { LogOut, FileText, Users, List } from 'lucide-react';

function AuthenticatedApp() {
  const { user, signOut, isAdmin, isVendedor } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'presupuesto' | 'list' | 'form'>(
    isAdmin ? 'dashboard' : 'list'
  );
  const [selectedPresupuestoId, setSelectedPresupuestoId] = useState<string>('');

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

          <nav className="flex gap-3 mt-4 pt-4 border-t-2 border-blue-600 bg-blue-50 -mx-6 px-6 py-3">
            {isAdmin && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                }`}
              >
                <Users className="w-5 h-5" />
                Panel de Aprobación
              </button>
            )}
            <button
              onClick={() => {
                setCurrentView('list');
                setSelectedPresupuestoId('');
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                currentView === 'list'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
              }`}
            >
              <List className="w-5 h-5" />
              Mis Presupuestos
            </button>
          </nav>
        </div>
      </header>

      <main className="py-8">
        {currentView === 'dashboard' && <AdminDashboard />}
        {currentView === 'list' && (
          <PresupuestoList
            onSelectPresupuesto={(id) => {
              setSelectedPresupuestoId(id);
              setCurrentView('presupuesto');
            }}
            onCreateNew={() => {
              setSelectedPresupuestoId('');
              setCurrentView('form');
            }}
          />
        )}
        {currentView === 'form' && (
          <PresupuestoForm
            presupuestoId={selectedPresupuestoId}
            onSave={() => {
              setCurrentView('list');
              setSelectedPresupuestoId('');
            }}
            onCancel={() => {
              setCurrentView('list');
              setSelectedPresupuestoId('');
            }}
          />
        )}
        {currentView === 'presupuesto' && selectedPresupuestoId && (
          <PresupuestoDetail presupuestoId={selectedPresupuestoId} />
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
