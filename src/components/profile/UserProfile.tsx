import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SignatureUpload } from './SignatureUpload';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { User, Mail, Phone, Building } from 'lucide-react';

export function UserProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    signature_url: user?.signature_url || '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        signature_url: user.signature_url || '',
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Update error details:', error);
        throw error;
      }

      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });

      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      const errorMessage = err.message || 'Error al actualizar el perfil';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h2>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Nombre Completo
              </label>
              <Input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Tu nombre completo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <Input
                type="email"
                value={profileData.email}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">El email no puede ser modificado</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Teléfono
              </label>
              <Input
                type="tel"
                value={profileData.phone || ''}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+595 981 123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building className="w-4 h-4 inline mr-1" />
                Rol
              </label>
              <Input
                type="text"
                value={
                  user.role === 'admin' ? 'Administrador' :
                  user.role === 'administrativo' ? 'Administrativo' :
                  'Vendedor'
                }
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <SignatureUpload
              currentSignatureUrl={profileData.signature_url || undefined}
              userId={user.id}
              onSignatureUpdate={(url) => setProfileData({ ...profileData, signature_url: url || '' })}
            />
          </div>

          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
            >
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
