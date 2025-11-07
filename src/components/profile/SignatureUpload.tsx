import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Upload, Trash2, AlertCircle } from 'lucide-react';

interface SignatureUploadProps {
  currentSignatureUrl?: string;
  userId: string;
  onSignatureUpdate: (url: string | null) => void;
}

export function SignatureUpload({ currentSignatureUrl, userId, onSignatureUpdate }: SignatureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar 2MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Primero eliminar la firma anterior si existe
      if (currentSignatureUrl) {
        try {
          const oldFilePath = currentSignatureUrl.split('/').slice(-2).join('/');
          await supabase.storage.from('images').remove([oldFilePath]);
        } catch (err) {
          console.log('No se pudo eliminar la firma anterior:', err);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `signature_${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message || 'Error al subir el archivo');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ signature_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(updateError.message || 'Error al actualizar el perfil');
      }

      onSignatureUpdate(publicUrl);
      setError('');
    } catch (err: any) {
      console.error('Error uploading signature:', err);
      setError(err.message || 'Error al subir la firma. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentSignatureUrl) return;

    if (!confirm('¿Estás seguro de eliminar tu firma?')) return;

    try {
      setUploading(true);
      setError('');

      const filePath = currentSignatureUrl.split('/').slice(-2).join('/');

      await supabase.storage.from('images').remove([filePath]);

      const { error: updateError } = await supabase
        .from('users')
        .update({ signature_url: null })
        .eq('id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(updateError.message || 'Error al actualizar el perfil');
      }

      onSignatureUpdate(null);
    } catch (err: any) {
      console.error('Error deleting signature:', err);
      setError(err.message || 'Error al eliminar la firma. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Firma Digital
        </label>
        <p className="text-xs text-gray-600 mb-4">
          Sube una imagen de tu firma (JPG, PNG). Máximo 2MB. Esta firma aparecerá en tus presupuestos.
        </p>

        {currentSignatureUrl ? (
          <div className="space-y-3">
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-white flex items-center justify-center">
              <img
                src={currentSignatureUrl}
                alt="Firma"
                className="max-h-24 max-w-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  disabled={uploading}
                  onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Cambiar Firma
                </Button>
              </label>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={uploading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Haz click para subir tu firma
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG (máx. 2MB)
              </p>
            </div>
          </label>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Procesando...
        </div>
      )}
    </div>
  );
}
