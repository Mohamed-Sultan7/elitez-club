import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (base64: string, fileName: string) => void;
  onRemove?: () => void;
  selectedImage?: string;
  className?: string;
  disabled?: boolean;
  mode?: 'inline' | 'modal';
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onRemove,
  selectedImage,
  className = '',
  disabled = false,
  mode = 'inline'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setIsConverting(true);
      const base64 = await convertToBase64(file);
      onImageSelect(base64, file.name);
    } catch (error) {
      console.error('Error converting image:', error);
      alert('Error converting image');
    } finally {
      setIsConverting(false);
    }
  }, [convertToBase64, onImageSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
      if (mode === 'modal') {
        setIsModalOpen(false);
      }
    }
  }, [handleFileSelect, disabled, mode]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      if (mode === 'modal') {
        setIsModalOpen(true);
      } else if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  }, [disabled, mode]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow selecting the same file again
    e.target.value = '';
    if (mode === 'modal') {
      setIsModalOpen(false);
    }
  }, [handleFileSelect, mode]);

  if (selectedImage) {
    return (
      <div className={`relative inline-block ${className}`}>
        <img
          src={selectedImage}
          alt="Selected"
          className="max-w-32 max-h-32 rounded-lg border border-white/20"
        />
        {onRemove && !disabled && (
          <button
            onClick={onRemove}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
            title="Remove Image"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}
      </div>
    );
  }

  // Modal mode - render small button
  if (mode === 'modal') {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`
            w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${className}
          `}
          title="Attach Image"
        >
          <ImageIcon className="w-4 h-4 text-white/70" />
        </button>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Attach Image</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-6 h-6 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3 text-white/70" />
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
              />
              
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                  ${isDragging 
                    ? 'border-gold bg-gold/10' 
                    : 'border-white/30 hover:border-white/50 hover:bg-white/5'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  ${isConverting ? 'pointer-events-none' : ''}
                `}
              >
                {isConverting ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-white/70">Converting image...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                      {isDragging ? (
                        <Upload className="w-6 h-6 text-gold" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-white/70" />
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="text-white/70">
                        {isDragging ? 'Drop it here' : 'Click to select an image or drag it here'}
                      </span>
                      <div className="text-xs text-white/50 mt-1">
                        PNG, JPG, GIF up to 5MB
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-gold bg-gold/10' 
            : 'border-white/30 hover:border-white/50 hover:bg-white/5'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isConverting ? 'pointer-events-none' : ''}
        `}
      >
        {isConverting ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-white/70">Converting image...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              {isDragging ? (
                <Upload className="w-5 h-5 text-gold" />
              ) : (
                <ImageIcon className="w-5 h-5 text-white/70" />
              )}
            </div>
            <div className="text-sm">
              <span className="text-white/70">
                {isDragging ? 'Drop it here' : 'Click to select an image or drag it here'}
              </span>
              <div className="text-xs text-white/50 mt-1">
                PNG, JPG, GIF up to 5MB
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;