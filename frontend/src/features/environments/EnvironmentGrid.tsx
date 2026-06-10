import { motion } from "motion/react";
import type { Environment } from "@/api/types";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import EnvironmentCard from "./EnvironmentCard";

interface EnvironmentGridProps {
  environments: Environment[];
  highlightedId: string | null;
  pendingId: string | null;
  /** Whether the entrance stagger should play (initial successful load only). */
  animateEntrance: boolean;
  registerRef: (id: string, node: HTMLDivElement | null) => void;
  onSelect: (environment: Environment) => void;
  onPrimaryAction: (environment: Environment) => void;
  onStart: (environment: Environment) => void;
  onStop: (environment: Environment) => void;
  onDelete: (environment: Environment) => void;
}

function EnvironmentGrid({
  environments,
  highlightedId,
  pendingId,
  animateEntrance,
  registerRef,
  onSelect,
  onPrimaryAction,
  onStart,
  onStop,
  onDelete,
}: EnvironmentGridProps): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const stagger = animateEntrance && !reducedMotion;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {environments.map((environment, index) => (
        <motion.div
          key={environment.id}
          initial={stagger ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            delay: stagger ? Math.min(index * 0.05, 0.4) : 0,
            ease: "easeOut",
          }}
          layout
        >
          <EnvironmentCard
            environment={environment}
            highlighted={environment.id === highlightedId}
            pending={pendingId === environment.id}
            registerRef={registerRef}
            onSelect={onSelect}
            onPrimaryAction={onPrimaryAction}
            onStart={onStart}
            onStop={onStop}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </div>
  );
}

export default EnvironmentGrid;
