import { useCallback, useState } from "react";
import type { FileWithPath } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { generateClientDropzoneAccept } from "uploadthing/client";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing-react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { OurFileRouter } from "@/lib/uploadthing";

interface ImageUploadProps {
  onChange: (value: { url: string; key: string } | null) => void;
  value: { url: string; key: string } | null;
  disabled?: boolean;
  onReset?: () => void;
}

export const ImageUpload = ({
  onChange,
  value,
  disabled,
  onReset,
}: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(value?.url || null);

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      if (acceptedFiles.length === 0) return;
      
      // Preview the selected image
      const file = acceptedFiles[0];
      const imageUrl = URL.createObjectURL(file);
      setPreview(imageUrl);
    },
    []
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: generateClientDropzoneAccept(["image"]),
    maxFiles: 1,
    disabled,
  });

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (onReset) onReset();
  };

  return (
    <div className="space-y-4 w-full">
      {preview ? (
        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200">
          <div className="absolute top-2 right-2 z-10">
            <Button
              type="button"
              onClick={handleRemove}
              variant="destructive"
              size="icon"
              className="h-7 w-7 rounded-full"
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Image
            fill
            className="object-cover"
            alt="Upload preview"
            src={preview}
          />
        </div>
      ) : (
        <UploadDropzone<OurFileRouter, "postImage">
          endpoint="postImage"
          onClientUploadComplete={(res: any) => {
            if (res && res.length > 0) {
              setPreview(res[0].url || res[0].fileUrl);
              onChange({
                url: res[0].url || res[0].fileUrl,
                key: res[0].key || res[0].fileKey,
              });
            }
          }}
          onUploadError={(error: Error) => {
            console.error(error);
            alert("Upload failed: " + error.message);
          }}
        />
      )}
    </div>
  );
}; 