import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { VendedorDashboard } from './components/dashboard/VendedorDashboard';
import { PresupuestoDetail } from './pages/PresupuestoDetail';
import { PresupuestoList } from './components/presupuestos/PresupuestoList';
import { PresupuestoForm } from './components/presupuestos/PresupuestoForm';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { UserList } from './components/users/UserList';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { CatalogoPage } from './components/catalogo/CatalogoPage';
import { UserProfile } from './components/profile/UserProfile';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { LogOut, FileText, Users, List, BarChart3, UserCog, LayoutDashboard, Package, Eye, EyeOff, UserCircle } from 'lucide-react';

function AuthenticatedApp() {
  const { user, signOut, isAdmin, isAdministrativo } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'presupuesto' | 'list' | 'form' | 'reports' | 'users' | 'catalogo' | 'profile'>('dashboard');
  const [selectedPresupuestoId, setSelectedPresupuestoId] = useState<string>('');

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Cargando perfil de usuario...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    console.log('🔘 Sign out button clicked');
    await signOut();
    console.log('✅ Sign out completed in App');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/hdm-logo.png"
                alt="HDM Ingeniería"
                className="h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Sistema de Presupuestos
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
                  {isAdmin ? 'Administrador' : isAdministrativo ? 'Administrativo' : 'Vendedor'}
                </p>
              </div>

              <NotificationCenter />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('profile')}
                className="z-50 relative"
              >
                <UserCircle className="w-4 h-4 mr-2" />
                Mi Perfil
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="z-50 relative"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>

          <nav className="flex gap-3 mt-4 pt-4 border-t-2 border-blue-600 bg-blue-50 -mx-6 px-6 py-3">
            {isAdmin ? (
              <>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'dashboard'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Aprobaciones
                </button>
                <button
                  onClick={() => setCurrentView('reports')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'reports'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  Reportes
                </button>
                <button
                  onClick={() => setCurrentView('catalogo')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'catalogo'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <Package className="w-5 h-5" />
                  Catálogo
                </button>
                <button
                  onClick={() => setCurrentView('users')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'users'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <UserCog className="w-5 h-5" />
                  Usuarios
                </button>
              </>
            ) : isAdministrativo ? (
              <>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'dashboard'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Aprobaciones
                </button>
                <button
                  onClick={() => setCurrentView('reports')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'reports'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  Reportes
                </button>
                <button
                  onClick={() => setCurrentView('catalogo')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'catalogo'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <Package className="w-5 h-5" />
                  Catálogo
                </button>
                <button
                  onClick={() => setCurrentView('users')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'users'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <UserCog className="w-5 h-5" />
                  Usuarios
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'dashboard'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Mi Dashboard
                </button>
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
                <button
                  onClick={() => setCurrentView('catalogo')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                    currentView === 'catalogo'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow'
                  }`}
                >
                  <Package className="w-5 h-5" />
                  Catálogo
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="py-8">
        {currentView === 'dashboard' && (
          isAdmin || isAdministrativo ? (
            <AdminDashboard
              onSelectPresupuesto={(id) => {
                setSelectedPresupuestoId(id);
                setCurrentView('presupuesto');
              }}
              onCreatePresupuesto={() => {
                setSelectedPresupuestoId('');
                setCurrentView('form');
              }}
            />
          ) : (
            <VendedorDashboard
              onSelectPresupuesto={(id) => {
                setSelectedPresupuestoId(id);
                setCurrentView('presupuesto');
              }}
            />
          )
        )}
        {currentView === 'reports' && <ReportsDashboard />}
        {currentView === 'users' && <UserList />}
        {currentView === 'catalogo' && <CatalogoPage />}
        {currentView === 'profile' && <UserProfile />}
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
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting login with:', email);
      await signIn(email, password);
      console.log('✅ Login successful');
    } catch (err) {
      console.error('❌ Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(errorMessage);
      alert(`Error de login: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img
            src="/hdm-logo.png"
            alt="HDM Ingeniería"
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sistema de Presupuestos
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

          <div className="relative">
            <Input
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

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

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // IMPORTANTE: Esta URL debe estar configurada en Supabase Dashboard
      // Authentication → URL Configuration → Redirect URLs
      const redirectUrl = `${window.location.origin}`;

      console.log('🔐 Sending password reset email');
      console.log('📧 Email:', email);
      console.log('🔗 Redirect URL:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img
            src="/hdm-logo.png"
            alt="HDM Ingeniería"
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Recuperar Contraseña
          </h1>
          <p className="text-gray-600">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 text-center">
                ¡Correo enviado! Revisa tu bandeja de entrada para restablecer tu contraseña.
              </p>
            </div>
            <Button type="button" fullWidth onClick={onBack}>
              Volver al inicio de sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo Electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@hdm.com"
              required
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" fullWidth loading={loading}>
              Enviar enlace de recuperación
            </Button>

            <Button type="button" variant="ghost" fullWidth onClick={onBack}>
              Volver al inicio de sesión
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetPasswordForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('🔍 Checking for recovery session...');

        // Wait a bit for Supabase to auto-process the recovery token
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if we have a valid session after Supabase auto-processing
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log('📊 Session check result:', {
          hasSession: !!session,
          error: sessionError,
          url: window.location.href
        });

        if (session) {
          console.log('✅ Valid recovery session found');
          setHasValidSession(true);
          // Clean the URL
          window.history.replaceState({}, '', window.location.pathname + '#recovery');
          setCheckingSession(false);
          return;
        }

        // No valid session found
        console.log('❌ No valid session found');
        setHasValidSession(false);
        setError('El enlace de recuperación ha expirado o no es válido. Por favor, solicita un nuevo enlace desde la pantalla de login.');
        setCheckingSession(false);
      } catch (err) {
        console.error('❌ Error checking session:', err);
        setHasValidSession(false);
        setError('Error al verificar la sesión. Por favor, solicita un nuevo enlace de recuperación.');
        setCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar la contraseña';
      if (errorMessage.includes('session')) {
        setError('Tu sesión de recuperación ha expirado. Por favor, solicita un nuevo enlace de recuperación.');
        setHasValidSession(false);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="animate-pulse">
            <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Verificando enlace de recuperación...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasValidSession === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <img
              src="/hdm-logo.png"
              alt="HDM Ingeniería"
              className="h-16 w-auto mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Enlace Expirado
            </h1>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
            <p className="text-sm text-amber-800 text-center">
              {error}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              fullWidth
              onClick={onCancel}
            >
              Volver al inicio de sesión
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Desde el inicio de sesión, haz clic en "¿Olvidaste tu contraseña?" para recibir un nuevo enlace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img
            src="/hdm-logo.png"
            alt="HDM Ingeniería"
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Nueva Contraseña
          </h1>
          <p className="text-gray-600">Ingresa tu nueva contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="Nueva Contraseña"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <Input
            label="Confirmar Contraseña"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            loading={loading}
          >
            Cambiar Contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsResettingPassword(true);
    }
  }, []);

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

  if (isResettingPassword && !passwordResetSuccess) {
    return (
      <ResetPasswordForm
        onSuccess={() => {
          setPasswordResetSuccess(true);
          setIsResettingPassword(false);
          window.location.hash = '';
        }}
        onCancel={() => {
          setIsResettingPassword(false);
          window.location.hash = '';
          window.location.reload();
        }}
      />
    );
  }

  if (passwordResetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Contraseña actualizada!
            </h2>
            <p className="text-gray-600">
              Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
          </div>
          <Button
            fullWidth
            onClick={() => {
              setPasswordResetSuccess(false);
              window.location.reload();
            }}
          >
            Ir al inicio de sesión
          </Button>
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
