import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  fallbackText?: string;
}

export function Logo({ className = "w-16 h-16 object-contain", size = 64, fallbackText = "SIDARSIH" }: LogoProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('/kp2a-logo.png');

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    if (currentSrc === '/kp2a-logo.png') {
      // Try alternative path
      setCurrentSrc('kp2a-logo.png');
    } else {
      // Both paths failed, show fallback
      setImageError(true);
      setImageLoaded(false);
    }
  };

  // Reset state when src changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [currentSrc]);

  if (imageError) {
    // Fallback to text logo
    return (
      <div 
        className={`inline-flex items-center justify-center bg-blue-600 text-white font-bold rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-sm">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img 
      src={currentSrc}
      alt="SIDARSIH Logo" 
      className={className}
      onLoad={handleImageLoad}
      onError={handleImageError}
      style={{ 
        opacity: imageLoaded ? 1 : 0.5,
        transition: 'opacity 0.3s ease'
      }}
    />
  );
}

export default Logo;