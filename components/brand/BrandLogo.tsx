"use client";

type BrandLogoProps = {
  className?: string;
  stableRings?: boolean;
};

const NODE_TRANSFORMS = [
  "brand-logo__node--a",
  "brand-logo__node--b",
  "brand-logo__node--c",
  "brand-logo__node--d",
  "brand-logo__node--e",
] as const;

export default function BrandLogo({
  className = "",
  stableRings = false,
}: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo de PODAT"
      role="img"
      className={`brand-logo ${stableRings ? "brand-logo--stable-rings" : ""} ${className}`}
    >
      <g className="brand-logo__outer-ring">
        <circle cx="120" cy="120" r="106" stroke="#5D9AD4" strokeWidth="10" />
      </g>
      <g className="brand-logo__outer-orbit">
        <circle cx="120" cy="14" r="9" fill="#5D9AD4" fillOpacity="0.98" />
      </g>

      <g className="brand-logo__inner-ring">
        <circle cx="120" cy="120" r="88" stroke="#E6F0FA" strokeWidth="6" />
      </g>
      <g className="brand-logo__inner-orbit">
        <circle cx="120" cy="32" r="7" fill="#E6F0FA" fillOpacity="0.98" />
      </g>

      <g className="brand-logo__core">
        <g className="brand-logo__segment brand-logo__segment--ab">
          <line x1="80" y1="90" x2="120" y2="70" stroke="#5D9AD4" strokeWidth="3" />
        </g>
        <g className="brand-logo__segment brand-logo__segment--bc">
          <line x1="120" y1="70" x2="160" y2="95" stroke="#5D9AD4" strokeWidth="3" />
        </g>
        <g className="brand-logo__segment brand-logo__segment--ad">
          <line x1="80" y1="90" x2="95" y2="140" stroke="#5D9AD4" strokeWidth="3" />
        </g>
        <g className="brand-logo__segment brand-logo__segment--de">
          <line x1="95" y1="140" x2="150" y2="150" stroke="#5D9AD4" strokeWidth="3" />
        </g>
        <g className="brand-logo__segment brand-logo__segment--ec">
          <line x1="150" y1="150" x2="160" y2="95" stroke="#5D9AD4" strokeWidth="3" />
        </g>

        <g className={`brand-logo__node ${NODE_TRANSFORMS[0]}`}>
          <circle cx="80" cy="90" r="6" fill="#5D9AD4" />
        </g>
        <g className={`brand-logo__node ${NODE_TRANSFORMS[1]}`}>
          <circle cx="120" cy="70" r="6" fill="#5D9AD4" />
        </g>
        <g className={`brand-logo__node ${NODE_TRANSFORMS[2]}`}>
          <circle cx="160" cy="95" r="6" fill="#5D9AD4" />
        </g>
        <g className={`brand-logo__node ${NODE_TRANSFORMS[3]}`}>
          <circle cx="95" cy="140" r="6" fill="#5D9AD4" />
        </g>
        <g className={`brand-logo__node ${NODE_TRANSFORMS[4]}`}>
          <circle cx="150" cy="150" r="6" fill="#5D9AD4" />
        </g>
      </g>
    </svg>
  );
}
