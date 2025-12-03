"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ImageUploaderProps {
  value: File[];
  onChange: (files: File[]) => void;
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (value && value.length > 0) {
      const newPreviews = value.map((file) =>
        typeof file === "string" ? file : URL.createObjectURL(file)
      );
      setPreviews(newPreviews);

      return () => {
        newPreviews.forEach((preview) => {
          if (preview.startsWith("blob:")) {
            URL.revokeObjectURL(preview);
          }
        });
      };
    } else {
      setPreviews([]);
    }
  }, [value]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...(value || []), ...acceptedFiles];
      onChange(newFiles);

      const newPreviews = acceptedFiles.map((file) =>
        URL.createObjectURL(file),
      );
      setPreviews((prev) => [...prev, ...newPreviews]);
    },
    [value, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/gif": [],
      "image/webp": [],
    },
    multiple: true,
  });

  const handleRemove = (indexToRemove: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(previews[indexToRemove]);

    const updatedFiles = value.filter((_, index) => index !== indexToRemove);
    const updatedPreviews = previews.filter(
      (_, index) => index !== indexToRemove,
    );

    onChange(updatedFiles);
    setPreviews(updatedPreviews);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75 transition-colors",
          isDragActive && "border-primary bg-primary/10",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload</span> or drag and
            drop
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG, GIF or WEBP</p>
        </div>
      </div>
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group aspect-square">
              <Image
                src={preview}
                alt={`Preview ${index}`}
                onLoad={() => {
                  // Optional: if it was a blob URL, we can revoke it now if we want
                  // URL.revokeObjectURL(preview);
                }}
                fill
                className="object-cover rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove image</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}