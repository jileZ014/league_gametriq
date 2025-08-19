/**
 * Optimized Image Component for Basketball League Platform
 * Features: WebP/AVIF support, responsive images, lazy loading, placeholder blur
 * Target: <500ms image load time globally via CDN
 */

'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fallbackSrc?: string;
  onError?: () => void;
  onLoad?: () => void;
  // Basketball-specific props
  playerPhoto?: boolean;
  teamLogo?: boolean;
  tournamentPhoto?: boolean;
  preloadHint?: 'lazy' | 'eager';
}

/**
 * Generate optimized blur placeholder for images
 */
const generateBlurDataURL = (width: number = 8, height: number = 8): string => {
  // Create a simple gradient blur placeholder
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) {
    // Fallback static blur data URL
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Create basketball court colors gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#8B5A3C'); // Court brown
  gradient.addColorStop(1, '#D2B48C'); // Light brown
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
};

/**
 * Optimized responsive image sizes for different content types
 */
const getOptimizedSizes = (
  imageType: 'player' | 'team' | 'tournament' | 'general'
): string => {
  switch (imageType) {
    case 'player':
      return '(max-width: 640px) 120px, (max-width: 768px) 150px, (max-width: 1024px) 200px, 250px';
    case 'team':
      return '(max-width: 640px) 80px, (max-width: 768px) 100px, (max-width: 1024px) 120px, 150px';
    case 'tournament':
      return '(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1200px) 80vw, 1200px';
    default:
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
  }
};

/**
 * Convert image URL to CDN optimized URL
 */
const getOptimizedImageUrl = (src: string, width?: number, height?: number, quality?: number): string => {
  // If already a full URL or data URL, return as is
  if (src.startsWith('http') || src.startsWith('data:')) {
    return src;
  }

  // Use CloudFront domain if available
  const cdnDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || process.env.NEXT_PUBLIC_CDN_DOMAIN;
  
  if (cdnDomain) {
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality) params.set('q', quality.toString());
    
    const queryString = params.toString();
    return `${cdnDomain}${src}${queryString ? `?${queryString}` : ''}`;
  }

  return src;
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  sizes,
  fill = false,
  objectFit = 'cover',
  placeholder = 'blur',
  blurDataURL,
  fallbackSrc,
  onError,
  onLoad,
  playerPhoto = false,
  teamLogo = false,
  tournamentPhoto = false,
  preloadHint = 'lazy',
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Determine image type for optimization
  const imageType = playerPhoto ? 'player' : teamLogo ? 'team' : tournamentPhoto ? 'tournament' : 'general';
  
  // Generate optimized sizes if not provided
  const optimizedSizes = sizes || getOptimizedSizes(imageType);
  
  // Generate blur placeholder if not provided
  const optimizedBlurDataURL = blurDataURL || (
    placeholder === 'blur' ? generateBlurDataURL(width, height) : undefined
  );

  // Get optimized image URL
  const optimizedSrc = getOptimizedImageUrl(imgSrc, width, height, quality);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(false);
    } else {
      onError?.();
    }
  }, [fallbackSrc, imgSrc, onError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  // Error fallback component
  if (hasError && !fallbackSrc) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400',
          className
        )}
        style={{ width, height }}
        {...props}
      >
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  const imageProps = {
    src: optimizedSrc,
    alt,
    priority,
    quality,
    sizes: optimizedSizes,
    placeholder: placeholder as 'blur' | 'empty' | undefined,
    blurDataURL: optimizedBlurDataURL,
    onError: handleError,
    onLoad: handleLoad,
    className: cn(
      'transition-opacity duration-300',
      isLoading ? 'opacity-0' : 'opacity-100',
      className
    ),
    style: {
      objectFit,
      ...props.style,
    },
    // Preload hints for performance
    loading: preloadHint === 'eager' ? 'eager' : 'lazy',
    decoding: 'async',
    ...props,
  };

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
      />
    );
  }

  return (
    <Image
      {...imageProps}
      width={width}
      height={height}
    />
  );
};

/**
 * Specialized components for common basketball platform images
 */

export const PlayerPhoto: React.FC<Omit<OptimizedImageProps, 'playerPhoto'>> = (props) => (
  <OptimizedImage
    {...props}
    playerPhoto
    placeholder="blur"
    quality={80}
    sizes="(max-width: 640px) 120px, (max-width: 768px) 150px, 200px"
  />
);

export const TeamLogo: React.FC<Omit<OptimizedImageProps, 'teamLogo'>> = (props) => (
  <OptimizedImage
    {...props}
    teamLogo
    placeholder="blur"
    quality={90}
    sizes="(max-width: 640px) 60px, (max-width: 768px) 80px, 100px"
  />
);

export const TournamentPhoto: React.FC<Omit<OptimizedImageProps, 'tournamentPhoto'>> = (props) => (
  <OptimizedImage
    {...props}
    tournamentPhoto
    placeholder="blur"
    quality={85}
    priority
    sizes="(max-width: 640px) 100vw, (max-width: 1200px) 80vw, 1200px"
  />
);

/**
 * Image preloader utility for critical images
 */
export const preloadImage = (src: string, width?: number, height?: number): void => {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = getOptimizedImageUrl(src, width, height);
  
  // Add responsive preload for different screen sizes
  if (width && height) {
    link.imageSizes = `${width}px`;
    link.imageSrcset = [
      `${getOptimizedImageUrl(src, Math.round(width * 0.5), Math.round(height * 0.5))} ${Math.round(width * 0.5)}w`,
      `${getOptimizedImageUrl(src, width, height)} ${width}w`,
      `${getOptimizedImageUrl(src, Math.round(width * 1.5), Math.round(height * 1.5))} ${Math.round(width * 1.5)}w`,
    ].join(', ');
  }

  document.head.appendChild(link);
};

/**
 * Batch preload multiple images for tournament pages
 */
export const preloadTournamentImages = (images: Array<{ src: string; width?: number; height?: number }>): void => {
  images.forEach(({ src, width, height }) => {
    preloadImage(src, width, height);
  });
};

export default OptimizedImage;