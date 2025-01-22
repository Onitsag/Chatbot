import React from 'react';
import { X } from 'lucide-react';
import { ChatImage } from '../types';

interface ImageGalleryProps {
  images: ChatImage[];
  selectedImages?: string[];
  onImageSelect?: (imageId: string) => void;
  onImageDelete?: (imageId: string) => void;
  isSelectable?: boolean;
}

export function ImageGallery({
  images,
  selectedImages = [],
  onImageSelect,
  onImageDelete,
  isSelectable = false
}: ImageGalleryProps) {
  const handleImageClick = (imageId: string) => {
    if (isSelectable && onImageSelect) {
      onImageSelect(imageId);
      const textArea = document.querySelector('textarea, input[type="text"]') as HTMLTextAreaElement | HTMLInputElement | null;
      if (textArea) {
        const imageRef = `[Image ${imageId}]`;
        const cursorPos = textArea.selectionStart || 0;
        const textBefore = textArea.value.substring(0, cursorPos);
        const textAfter = textArea.value.substring(cursorPos);
        textArea.value = textBefore + imageRef + textAfter;
        textArea.focus();
        textArea.selectionStart = textArea.selectionEnd = cursorPos + imageRef.length;
      }
    }
  };

  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {images.map((image) => (
        <div
          key={image.id}
          className={`relative group ${
            isSelectable ? 'cursor-pointer' : ''
          } ${
            selectedImages.includes(image.id)
              ? 'ring-2 ring-blue-500'
              : ''
          }`}
          onClick={() => handleImageClick(image.id)}
        >
          <div className="aspect-square relative overflow-hidden rounded-lg">
            <img
              src={image.base64}
              alt={image.description}
              className="object-cover w-full h-full"
            />
            {onImageDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImageDelete(image.id);
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-300 line-clamp-2">
            {image.description}
          </div>
        </div>
      ))}
    </div>
  );
}