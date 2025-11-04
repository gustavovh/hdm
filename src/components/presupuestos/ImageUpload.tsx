import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  presupuestoId: string;
  onUploadComplete?: () => void;
}

interface UploadedImage {
  id: string;
  url: string;
  nombre_archivo: string;
  tamanio: number;
  descripcion: string | null;
}

export function ImageUpload({ presupuestoId, onUploadComplete }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('presupuesto_imagenes')
        .select('*')
        .eq('presupuesto_id', presupuestoId)
        .order('orden', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    if (presupuestoId) {
      loadImages();
    }
  });

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${presupuestoId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('presupuesto-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('presupuesto-images')
        .getPublicUrl(uploadData.path);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      const { error: dbError } = await supabase
        .from('presupuesto_imagenes')
        .insert({
          presupuesto_id: presupuestoId,
          url: publicUrl,
          nombre_archivo: file.name,
          tipo_mime: file.type,
          tamanio: file.size,
          orden: images.length,
          created_by: user.user.id
        });

      if (dbError) throw dbError;

      await loadImages();
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: string, url: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return;

    try {
      const path = url.split('/presupuesto-images/')[1];

      await supabase.storage
        .from('presupuesto-images')
        .remove([path]);

      const { error } = await supabase
        .from('presupuesto_imagenes')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      await loadImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error al eliminar la imagen');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo no debe superar 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Solo se permiten imágenes');
        return;
      }
      uploadImage(file);
    }
  };

  if (!presupuestoId) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-sm text-gray-600 text-center">
          Guarda el presupuesto primero para poder agregar imágenes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Imágenes del Presupuesto
        </h3>

        <label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            as="span"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Subiendo...' : 'Subir Imagen'}
          </Button>
        </label>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Cargando imágenes...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            No hay imágenes adjuntas
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Haz clic en "Subir Imagen" para agregar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
            >
              <img
                src={image.url}
                alt={image.nombre_archivo}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                <button
                  onClick={() => deleteImage(image.id, image.url)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                  title="Eliminar imagen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs truncate">{image.nombre_archivo}</p>
                <p className="text-xs text-gray-300">
                  {(image.tamanio / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Tamaño máximo: 5MB por imagen. Formatos: JPG, PNG, GIF, WebP
      </p>
    </div>
  );
}
