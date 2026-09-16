import React from 'react';

interface NorthArrowProps {
  rotationDeg?: number;
}

export const NorthArrow: React.FC<NorthArrowProps> = ({ rotationDeg = 0 }) => {
  return (
    <div
      className="north-arrow-widget"
      style={{
        width: 44,
        height: 44,
        background: 'var(--bg-panel)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-md)',
        pointerEvents: 'auto',
      }}
      title="North Indicator (+Y Northing)"
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        style={{ transform: `rotate(${rotationDeg}deg)`, transition: 'transform 0.2s ease' }}
      >
        {/* Compass Ring */}
        <circle cx="17" cy="17" r="15" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
        
        {/* North Arrowhead (Black & White split CAD style) */}
        <polygon points="17,4 12,17 17,14" fill="#38bdf8" />
        <polygon points="17,4 22,17 17,14" fill="#0284c7" />
        
        {/* South Needle */}
        <polygon points="17,30 12,17 17,14" fill="rgba(255, 255, 255, 0.3)" />
        <polygon points="17,30 22,17 17,14" fill="rgba(255, 255, 255, 0.15)" />

        {/* N Letter */}
        <text
          x="17"
          y="10"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="7px"
          fontWeight="bold"
          fontFamily="var(--font-sans)"
        >
          N
        </text>
      </svg>
    </div>
  );
};
