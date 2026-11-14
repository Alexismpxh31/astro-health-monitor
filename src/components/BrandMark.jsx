// AstroSalud mark: an orbit around a heartbeat line. Own design, no third-party logos.
export default function BrandMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="brand-mark">
      <circle cx="24" cy="24" r="21" fill="url(#brand-fill)" />
      <ellipse cx="24" cy="24" rx="20" ry="8" fill="none" stroke="#9ec5ff" strokeWidth="1.6" transform="rotate(-24 24 24)" opacity="0.85" />
      <path d="M9 25h8l3-7 5 14 3-7h11" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="39.5" cy="15.5" r="2.6" fill="#7dd3fc" />
      <defs>
        <linearGradient id="brand-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0b1f4d" />
        </linearGradient>
      </defs>
    </svg>
  )
}
