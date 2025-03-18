import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ImageIcon, ZoomIn, ZoomOut, Info } from "lucide-react";
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
  const [fullscreen, setFullscreen] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState<boolean[]>([]);
  const [imageErrorStates, setImageErrorStates] = useState<boolean[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Control visibility timeout
  let controlsTimeout: NodeJS.Timeout | null = null;

  // Initialize loading states
  useEffect(() => {
    setImageLoadingStates(new Array(images.length).fill(false));
    setImageErrorStates(new Array(images.length).fill(false));
    // Reset zoom state when images change
    setIsZoomed(false);
  }, [images.length]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsZoomed(false); // Reset zoom when changing images
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    resetControlsTimeout();
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsZoomed(false); // Reset zoom when changing images
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    resetControlsTimeout();
  };

  const handleImageLoad = (index: number) => {
    setImageLoadingStates((prev) => {
      const newStates = [...prev];
      newStates[index] = false;
      return newStates;
    });
    onImageLoad?.(index);
  };

  const handleImageError = (index: number) => {
    setImageLoadingStates((prev) => {
      const newStates = [...prev];
      newStates[index] = false;
      return newStates;
    });
    setImageErrorStates((prev) => {
      const newStates = [...prev];
      newStates[index] = true;
      return newStates;
    });
    onImageError?.(index);
  };

  const openFullscreen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    console.log("Opening fullscreen gallery");
    setFullscreen(true);
    resetControlsTimeout();
  };
  
  const toggleZoom = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsZoomed(!isZoomed);
    resetControlsTimeout();
  };
  
  const handleDialogClick = () => {
    setShowControls(prev => !prev);
    resetControlsTimeout();
  };
  
  const resetControlsTimeout = () => {
    // Clear existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    // Show controls
    setShowControls(true);
    
    // Set a new timeout to hide controls after 3 seconds of inactivity
    controlsTimeout = setTimeout(() => {
      if (!isZoomed) { // Don't auto-hide controls when zoomed
        setShowControls(false);
      }
    }, 3000);
  };
  
  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNext(),
    onSwipedRight: () => handlePrev(),
    onSwipedUp: () => setFullscreen(false),
    onTap: () => handleDialogClick(),
    trackMouse: true
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullscreen) return;
      
      switch (e.key) {
        case "ArrowLeft":
          handlePrev();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          if (isZoomed) {
            setIsZoomed(false);
          } else {
            setFullscreen(false);
          }
          break;
        case " ": // Space key
          toggleZoom();
          e.preventDefault();
          break;
      }
      
      resetControlsTimeout();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [fullscreen, isZoomed]);
  
  // Setup auto-hide for controls on fullscreen
  useEffect(() => {
    if (fullscreen) {
      resetControlsTimeout();
    }
    
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [fullscreen]);

  // Simple case: single image
  if (images.length === 1) {
    return (
      <div 
        className={cn(
          "relative w-full aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer",
          containerClassName
        )}
      >
        {imageLoadingStates[0] === true && !imageErrorStates[0] && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-pulse">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        )}
        {imageErrorStates[0] === true && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load image</p>
          </div>
        )}
        <div className="absolute bottom-2 right-2 z-10">
          <Button 
            size="icon" 
            variant="secondary" 
            className="h-8 w-8 rounded-full opacity-80 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              openFullscreen();
            }}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Add a clickable overlay for better touch/click area */}
        <div 
          className="absolute inset-0 z-5 cursor-pointer" 
          onClick={openFullscreen}
          aria-label="View image fullscreen"
        ></div>
        
        <Image
          src={images[0].url}
          alt="Gallery image"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
          onLoad={() => handleImageLoad(0)}
          onError={() => handleImageError(0)}
          crossOrigin="anonymous"
        />
      </div>
    );
  }

  // Multiple images
  return (
    <>
      <div 
        ref={galleryRef}
        className={cn(
          "relative w-full aspect-video rounded-lg overflow-hidden bg-muted",
          containerClassName
        )}
      >
        {/* Main image */}
        <div 
          className="w-full h-full cursor-pointer"
        >
          {imageLoadingStates[currentIndex] === true && !imageErrorStates[currentIndex] && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-pulse">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          )}
          {imageErrorStates[currentIndex] === true && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load image</p>
            </div>
          )}
          
          {/* Add a clickable overlay for better touch/click area */}
          <div 
            className="absolute inset-0 z-5 cursor-pointer" 
            onClick={openFullscreen}
            aria-label="View gallery fullscreen"
          ></div>
          
          <Image
            src={images[currentIndex].url}
            alt={`Gallery image ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            onLoad={() => handleImageLoad(currentIndex)}
            onError={() => handleImageError(currentIndex)}
            crossOrigin="anonymous"
          />
        </div>

        {/* Navigation buttons */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100 z-10"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100 z-10"
          onClick={handleNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Zoom button */}
        <Button 
          size="icon" 
          variant="secondary" 
          className="absolute bottom-2 right-2 z-10 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
          onClick={openFullscreen}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        {/* Thumbnail indicators */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white scale-125"
                  : "bg-white/50 hover:bg-white/80"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              aria-label={`View image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent 
          {...swipeHandlers}
          className={cn(
            "sm:max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none transition-all duration-300 overflow-hidden",
            isZoomed ? "cursor-zoom-out" : "cursor-pointer"
          )}
        >
          <div 
            ref={dialogRef}
            className="relative w-full h-[90vh] flex items-center justify-center overflow-hidden"
            onClick={isZoomed ? toggleZoom : handleDialogClick}
          >
            {/* Close button */}
            {showControls && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 text-white z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreen(false);
                }}
              >
                <X className="h-6 w-6" />
              </Button>
            )}

            {/* Left navigation */}
            {showControls && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
              >
                <ChevronLeft className="h-10 w-10" />
              </Button>
            )}

            {/* Image container */}
            <div 
              className={cn(
                "relative h-full transition-transform duration-300 ease-out",
                isZoomed ? "w-[200%]" : "w-full"
              )}
            >
              {/* Loading indicator */}
              {imageLoadingStates[currentIndex] === true && !imageErrorStates[currentIndex] && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 animate-pulse">
                    <ImageIcon className="h-16 w-16 text-white/70" />
                  </div>
                </div>
              )}
              
              {/* Error state */}
              {imageErrorStates[currentIndex] === true && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-white/70 mb-4" />
                  <p className="text-xl text-white/70">Failed to load image</p>
                </div>
              )}
              
              <Image
                src={images[currentIndex].url}
                alt={`Gallery image ${currentIndex + 1} (fullscreen)`}
                fill
                className={cn(
                  "transition-all duration-300",
                  isZoomed ? "object-contain scale-150" : "object-contain"
                )}
                sizes="100vw"
                priority
                crossOrigin="anonymous"
                onLoad={() => handleImageLoad(currentIndex)}
                onError={() => handleImageError(currentIndex)}
              />
            </div>

            {/* Right navigation */}
            {showControls && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              >
                <ChevronRight className="h-10 w-10" />
              </Button>
            )}

            {/* Zoom toggle button */}
            {showControls && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 bottom-2 text-white z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleZoom();
                }}
              >
                {isZoomed ? (
                  <ZoomOut className="h-6 w-6" />
                ) : (
                  <ZoomIn className="h-6 w-6" />
                )}
              </Button>
            )}

            {/* Image counter */}
            {showControls && images.length > 1 && (
              <div className="absolute left-2 bottom-2 text-white z-50 bg-black/30 px-2 py-1 rounded">
                <span className="text-sm">
                  {currentIndex + 1} / {images.length}
                </span>
              </div>
            )}

            {/* Thumbnail indicators */}
            {showControls && images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all",
                      index === currentIndex
                        ? "bg-white scale-125"
                        : "bg-white/50 hover:bg-white/80"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(index);
                    }}
                    aria-label={`View image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 