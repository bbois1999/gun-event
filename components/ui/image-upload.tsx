import { useCallback, useState, useEffect } from "react";
import type { FileWithPath } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { generateClientDropzoneAccept } from "uploadthing/client";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing-react";
import { X, Upload, Image as ImageIcon, Plus, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { OurFileRouter } from "@/lib/uploadthing";

export interface ImageFile {
  url: string;
  key: string;
}

interface ImageUploadProps {
  onChange: (value: ImageFile[] | null) => void;
  value: ImageFile[] | null;
  disabled?: boolean;
  onReset?: () => void;
  maxImages?: number;
}

export const ImageUpload = ({
  onChange,
  value,
  disabled,
  onReset,
  maxImages = 10,
}: ImageUploadProps) => {
  const [previews, setPreviews] = useState<string[]>(
    value?.map(img => img.url) || []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Custom dropzone for better control over the UI
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    // Check if adding these would exceed max images
    if ((value?.length || 0) + acceptedFiles.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images in total.`);
      return;
    }
    
    // Set the selected files
    setSelectedFiles(acceptedFiles);
    
    // Show local previews immediately
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
    
    // Start the upload process
    uploadFiles(acceptedFiles);
  }, [value, maxImages]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    },
    multiple: true,
    disabled: isUploading || disabled || (value?.length || 0) >= maxImages
  });
  
  // Function to upload files using UploadThing directly
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    
    try {
      // Create a form with the files
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Get the endpoint URL from UploadThing
      const response = await fetch('/api/uploadthing', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      
      // Process the response from UploadThing
      if (data && data.length > 0) {
        handleUploadComplete(data);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload images. Please try again.');
      
      // Remove the local previews that failed to upload
      setPreviews(value?.map(img => img.url) || []);
    } finally {
      setIsUploading(false);
      setSelectedFiles([]);
    }
  };

  const handleUploadComplete = (res: any) => {
    setIsUploading(false);
    if (res && res.length > 0) {
      // Process all uploaded files
      const newImages = res.map((file: any) => ({
        url: file.url || file.fileUrl,
        key: file.key || file.fileKey,
      }));
      
      // Add to existing images
      const updatedImages = [...(value || []), ...newImages];
      onChange(updatedImages);
      
      // Update previews with the real URLs
      setPreviews([...(value?.map(img => img.url) || []), ...newImages.map((img: {url: string}) => img.url)]);
      
      // Reset selected files
      setSelectedFiles([]);
    }
  };

  const handleRemove = (index: number) => {
    if (!value) return;
    
    // Remove from value
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue.length > 0 ? newValue : null);
    
    // Remove from previews
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews.length > 0 ? newPreviews : []);
  };

  const handleRemoveAll = () => {
    setPreviews([]);
    onChange(null);
    if (onReset) onReset();
  };
  
  // Clear object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [previews]);

  const reachedMaxImages = value && value.length >= maxImages;

  return (
    <div className="space-y-4 w-full">
      {previews.length > 0 ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">
              {previews.length === 1 
                ? "1 image selected" 
                : `${previews.length} images selected`} 
              ({maxImages - previews.length} remaining)
            </p>
            <Button
              type="button"
              onClick={handleRemoveAll}
              variant="destructive"
              size="sm"
              disabled={disabled || isUploading}
            >
              Remove All
            </Button>
          </div>
          
          {/* Grid of images */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-2">
            {previews.map((previewUrl, index) => (
              <div 
                key={index} 
                className="relative aspect-square rounded-md overflow-hidden border border-gray-200 group"
              >
                <div className="absolute top-1 right-1 z-10">
                  <Button
                    type="button"
                    onClick={() => handleRemove(index)}
                    variant="destructive"
                    size="icon"
                    className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={disabled || isUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Image
                  fill
                  className="object-cover"
                  alt={`Upload preview ${index + 1}`}
                  src={previewUrl}
                />
                {isUploading && index >= (value?.length || 0) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Upload more button, if not at max */}
            {!reachedMaxImages && (
              <div 
                {...getRootProps()} 
                className="aspect-square rounded-md border border-dashed border-gray-300 flex flex-col items-center justify-center p-2 cursor-pointer hover:border-gray-400 transition-colors"
              >
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p className="text-xs text-center">Drop the files here...</p>
                ) : isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <>
                    <Plus className="h-6 w-6 mb-1 text-gray-400" />
                    <p className="text-xs text-center text-gray-500">Add more</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div 
          {...getRootProps()} 
          className="w-full border border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
        >
          <input {...getInputProps()} />
          
          {isDragActive ? (
            <div className="flex flex-col items-center">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Drop the images here...</p>
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-2" />
              <p className="text-sm text-gray-600">Uploading {selectedFiles.length} image(s)...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-1">Drag & drop images here, or click to select</p>
              <p className="text-xs text-gray-500">Up to {maxImages} images, max 16MB each</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 