import React from 'react';
import { Upload, X } from 'lucide-react';
import { generateImageDescription } from '../services/ai';

interface ImageUploaderProps {
  onImageUpload: (image: { base64: string; description: string; name: string }) => void;
  apiKey: string;
}

export function ImageUploader({ onImageUpload, apiKey }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const processImage = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('L\'image ne doit pas dépasser 5MB');
      }

      // Convertir l'image en base64
      const base64 = await convertToBase64(file);

      // Générer la description avec GPT-4 Vision
      const description = await generateImageDescription(apiKey, base64);

      // Envoyer l'image et sa description
      onImageUpload({ base64, description, name: file.name });
    } catch (error: any) {
      setError(error.message);
      console.error('Erreur lors du traitement de l\'image:', error);
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      await processImage(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImage(file);
    }
  };

  return (
    <div className="relative">
      <div
        className={`p-4 border-2 border-dashed rounded-lg transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 hover:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        <div className="flex flex-col items-center justify-center text-gray-400">
          <Upload size={24} className={`mb-2 ${isUploading ? 'animate-bounce' : ''}`} />
          <p className="text-sm text-center">
            {isUploading
              ? 'Analyse de l\'image en cours...'
              : 'Cliquez ou glissez une image ici'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded text-sm flex items-center gap-2">
          <X size={14} />
          {error}
        </div>
      )}
    </div>
  );
}