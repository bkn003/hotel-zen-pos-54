import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, X } from 'lucide-react';
import { uploadItemImage, getCachedImageUrl } from '@/utils/imageUtils';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  itemId?: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  itemId,
  className = ""
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      const imageUrl = await uploadItemImage(file, itemId || Date.now().toString());
      onChange(imageUrl);
      toast({
        title: "Image uploaded successfully",
        description: "Image has been compressed and uploaded"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    onChange('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Item"
            className="w-full h-32 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-32 border-2 border-dashed"
        >
          <div className="flex flex-col items-center space-y-2">
            {isUploading ? (
              <Upload className="h-6 w-6 animate-spin" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
            <span className="text-sm">
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </span>
            <span className="text-xs text-muted-foreground">
              Max 5MB, will be compressed to ~60KB
            </span>
          </div>
        </Button>
      )}
    </div>
  );
};