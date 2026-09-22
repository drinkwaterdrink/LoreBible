import React from "react";

export const MountainSilhouette: React.FC<{ className?: string }> = ({ className = "w-full h-8 opacity-25" }) => (
  <svg
    viewBox="0 0 400 32"
    fill="currentColor"
    preserveAspectRatio="none"
    className={className}
    aria-hidden="true"
  >
    <path d="M0 32 L20 22 L45 28 L75 14 L95 24 L120 18 L150 27 L185 10 L210 22 L245 8 L275 25 L310 16 L340 26 L370 12 L400 24 L400 32 Z" />
  </svg>
);

export const CompassRose: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = "text-[var(--accent-gold)]" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2" fill="currentColor" fillOpacity="0.15" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

export const QuillEmblem: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = "text-[var(--accent-gold)]" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M20.24 4.76a6 6 0 0 0-8.49 0L3.5 13.01 2 22l8.99-1.5 8.25-8.25a6 6 0 0 0 0-8.49z" />
    <line x1="16" y1="8" x2="2" y2="22" />
    <line x1="17.5" y1="15" x2="9" y2="15" />
  </svg>
);

export const PixelStars: React.FC<{ className?: string }> = ({ className = "text-[var(--accent-gold)] opacity-70" }) => (
  <svg
    width="48"
    height="12"
    viewBox="0 0 48 12"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <rect x="5" y="5" width="2" height="2" />
    <rect x="23" y="2" width="2" height="2" />
    <rect x="41" y="6" width="2" height="2" />
    <rect x="6" y="4" width="1" height="4" opacity="0.5" />
    <rect x="4" y="6" width="4" height="1" opacity="0.5" />
  </svg>
);
