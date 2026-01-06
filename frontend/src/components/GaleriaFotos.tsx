import React, { useState } from 'react';
import { ImageIcon, X, ZoomIn } from 'lucide-react';

interface Props {
  photos?: string[];
  title: string;
}

export const PhotoGallery: React.FC<Props> = ({ photos, title }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
        <ImageIcon className="w-4 h-4 mr-2" />
        {title}
      </h4>
      
      {/* Grid de Miniaturas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div 
            key={index} 
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100 group cursor-pointer shadow-sm hover:shadow-md transition-all"
            onClick={() => setSelectedImage(photo)}
          >
             <img 
               src={photo} 
               alt={`${title} ${index + 1}`} 
               className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110" 
             />
             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-6 h-6 drop-shadow-lg" />
             </div>
          </div>
        ))}
      </div>

      {/* Modal Lightbox (Tela Cheia) */}
      {selectedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 bg-gray-800 bg-opacity-50 rounded-full p-2 transition"
          >
            <X className="w-8 h-8" />
          </button>
          
          <img 
            src={selectedImage} 
            alt="Visualização em tela cheia" 
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Impede que clicar na imagem feche o modal
          />
        </div>
      )}
    </div>
  );
};