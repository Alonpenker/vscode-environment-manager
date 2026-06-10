import * as React from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Disable the spotlight while keeping the card fully functional. */
  enabled?: boolean;
}

/**
 * React Bits-inspired spotlight effect. A cyan radial follows the pointer.
 * Fully decorative: the effect can be disabled (or reduced-motion respected)
 * without affecting any behaviour or interactivity of the children.
 */
function SpotlightCard({
  enabled = true,
  className,
  children,
  ...props
}: SpotlightCardProps): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(false);

  const spotlightOn = enabled && !reducedMotion;

  const handleMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!spotlightOn || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      ref.current.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      ref.current.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    },
    [spotlightOn],
  );

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerEnter={() => spotlightOn && setActive(true)}
      onPointerLeave={() => setActive(false)}
      className={cn("relative", className)}
      {...props}
    >
      {spotlightOn && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: active ? 1 : 0,
            background:
              "radial-gradient(220px circle at var(--spot-x, 50%) var(--spot-y, 50%), hsl(var(--primary) / 0.14), transparent 70%)",
          }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export default SpotlightCard;
