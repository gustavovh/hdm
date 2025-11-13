import { useState } from 'react';
import { Button } from '../ui/Button';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ImageUploadSimpleProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
}

export function ImageUploadSimple({ images, onImagesChange }: ImageUploadSimpleProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} no es una imagen válida`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} es muy grande. Máximo 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newImages = [...images, ...validFiles];
    onImagesChange(newImages);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onImagesChange(newImages);
    setPreviews(newPreviews);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Imágenes para ANEXO
        </h3>
        <label className="inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 px-3 py-1.5 text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-400 cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-4 h-4 mr-2" />
          Agregar Imágenes
        </label>
      </div>

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-2">
            No hay imágenes cargadas
          </p>
          <p className="text-xs text-gray-500">
            Las imágenes se agregarán como páginas ANEXO en el PDF
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative border border-gray-200 rounded-lg overflow-hidden group"
            >
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate">
                {images[index].name}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-gray-500">
          {images.length} imagen(es) seleccionada(s). Se subirán al guardar el presupuesto.
        </p>
      )}
    </div>
  );
}
