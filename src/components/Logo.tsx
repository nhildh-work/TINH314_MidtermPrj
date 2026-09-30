interface LogoProps {
  size?: number;
  showText?: boolean;
  slogan?: string;
}

export default function SafePassLogo({ size = 42, showText = true, slogan }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Brand mark */}
      <svg
        width={size}
        height={Math.round(size * 1.14)}
        viewBox="0 0 44 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="sp-g1" x1="0" y1="0" x2="44" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5B21B6" />
            <stop offset="45%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient id="sp-g2" x1="0" y1="0" x2="44" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
          <filter id="sp-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Main shield */}
        <path
          d="M22 2.5L41 10.5V27C41 38.5 22 47.5 22 47.5C22 47.5 3 38.5 3 27V10.5L22 2.5Z"
          fill="url(#sp-g1)"
        />

        {/* Subtle inner rim */}
        <path
          d="M22 5.5L39 12.5V27C39 37.5 22 45.5 22 45.5"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Ticket perforation dots — left spine */}
        <circle cx="12.5" cy="21" r="2.2" fill="rgba(255,255,255,0.22)" />
        <circle cx="12.5" cy="28" r="2.2" fill="rgba(255,255,255,0.22)" />
        <circle cx="12.5" cy="35" r="2.2" fill="rgba(255,255,255,0.22)" />

        {/* Ticket stub divider */}
        <line
          x1="17.5" y1="16"
          x2="17.5" y2="39"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="0.9"
          strokeDasharray="1.5 2"
        />

        {/* Bold checkmark */}
        <path
          d="M21.5 29.5L26 34L34 22.5"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#sp-glow)"
        />
      </svg>

      {showText && (
        <div>
          <p
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "1.2rem",
              color: "#fff",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            SafePass
          </p>
          {slogan && (
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.62rem",
                color: "#A78BFA",
                letterSpacing: "0.04em",
                marginTop: "2px",
              }}
            >
              {slogan}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
