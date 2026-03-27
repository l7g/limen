/**
 * LIMEN Logo System
 *
 * Brand identity: Clean & approachable civic tech — national platform
 * Font: Space Grotesk (geometric, modern, technical)
 * Accent: The "L" is always rendered in teal (#00D9A3)
 *
 * Variants:
 * - mark: Colored "L" only (icon contexts, very small)
 * - compact: "LIMEN" wordmark with teal L (tight spaces)
 * - horizontal: "LIMEN" + tagline inline (header, wide spaces)
 * - stacked: "LIMEN" over tagline (square spaces, social, cards)
 *
 * Sizes: sm, md, lg, xl
 */

interface LogoProps {
  variant?: "mark" | "compact" | "horizontal" | "stacked";
  size?: "sm" | "md" | "lg" | "xl";
  inverted?: boolean;
  className?: string;
}

const sizes = {
  sm: {
    primary: "text-lg",
    secondary: "text-[10px]",
    mark: "text-xl",
    gap: "gap-1.5",
    stackGap: "gap-0.5",
  },
  md: {
    primary: "text-[22px]",
    secondary: "text-[12px]",
    mark: "text-[26px]",
    gap: "gap-2",
    stackGap: "gap-0.5",
  },
  lg: {
    primary: "text-[36px]",
    secondary: "text-[15px]",
    mark: "text-[42px]",
    gap: "gap-3",
    stackGap: "gap-1",
  },
  xl: {
    primary: "text-[52px]",
    secondary: "text-xl",
    mark: "text-[60px]",
    gap: "gap-4",
    stackGap: "gap-1.5",
  },
};

export default function Logo({
  variant = "horizontal",
  size = "md",
  inverted = false,
  className = "",
}: LogoProps) {
  const s = sizes[size];
  const textColor = inverted ? "text-white" : "text-gray-800";
  const secondaryColor = inverted ? "text-gray-400" : "text-gray-400";
  const accentColor = "text-[#00D9A3]";

  if (variant === "mark") {
    return (
      <span
        className={`font-heading ${s.mark} font-semibold tracking-[-0.02em] leading-none ${accentColor} ${className}`}
      >
        L
      </span>
    );
  }

  const wordmark = (sizeClass: string) => (
    <span
      className={`font-heading ${sizeClass} font-semibold tracking-[-0.01em] leading-none`}
    >
      <span className={accentColor}>L</span>
      <span className={textColor}>IMEN</span>
    </span>
  );

  if (variant === "compact") {
    return <div className={className}>{wordmark(s.primary)}</div>;
  }

  const tagline = (
    <span
      className={`font-heading ${s.secondary} font-normal tracking-[0.15em] uppercase leading-none ${secondaryColor}`}
    >
      Dati civici aperti
    </span>
  );

  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center ${s.stackGap} ${className}`}>
        {wordmark(s.primary)}
        {tagline}
      </div>
    );
  }

  return (
    <div className={`flex items-baseline ${s.gap} ${className}`}>
      {wordmark(s.primary)}
      {tagline}
    </div>
  );
}
