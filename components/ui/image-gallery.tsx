import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ImageIcon, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwipeable } from "react-swipeable";

export interface GalleryImage {
  url: string;
  key?: string;
  id?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  containerClassName?: string;
  onImageLoad?: (index: number) => void;
  onImageError?: (index: number) => void;
}

export function ImageGallery({
  images,
  containerClassName,
  onImageLoad,
  onImageError,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState<boolean[]>(new Array(images.length).fill(false));
  const [imageErrorStates, setImageErrorStates] = useState<boolean[]>(new Array(images.length).fill(false));
  
  const handlePrev = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrev,
    trackMouse: true,
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          handlePrev();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          setIsZoomed(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Gallery with ONE image at a time
  return (
    <div className={cn("relative w-full h-full flex flex-col items-center justify-center bg-zinc-900/95 text-zinc-200", containerClassName)}>
      <div 
        className="relative w-full h-full flex items-center justify-center"
        {...swipeHandlers}
      >
        {/* Current image */}
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={images[currentIndex].url}
            alt={`Gallery image ${currentIndex + 1}`}
            className={cn(
              "max-w-[85vw] sm:max-w-[80vw] md:max-w-[75vw] lg:max-w-[70vw] max-h-[75vh] sm:max-h-[80vh] object-contain transition-transform duration-200",
              isZoomed ? "scale-150" : "scale-100"
            )}
            style={{ transition: "transform 0.2s ease" }}
            onClick={toggleZoom}
          />
        </div>
        
        {/* Left arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 h-10 w-10 rounded-full bg-zinc-800/70 text-zinc-200 hover:bg-zinc-700/90"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        
        {/* Right arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 h-10 w-10 rounded-full bg-zinc-800/70 text-zinc-200 hover:bg-zinc-700/90"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
        
        {/* Zoom button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-zinc-800/70 text-zinc-200 hover:bg-zinc-700/90"
          onClick={toggleZoom}
        >
          {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
        </Button>
        
        {/* Image counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800/70 text-zinc-200 px-3 py-1 rounded-full">
          <p className="text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      </div>
    </div>
  );
} 