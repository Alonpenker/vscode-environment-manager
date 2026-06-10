/**
 * Restrained ambient glow: cyan top-center plus a violet accent.
 * Static (no continuous animation), non-interactive, and hidden from AT.
 */
function CyanGlow(): React.ReactElement {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute left-1/2 top-[-12rem] h-[28rem] w-[44rem] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: "hsl(var(--primary) / 0.16)" }}
      />
      <div
        className="absolute right-[-8rem] top-[18rem] h-[24rem] w-[24rem] rounded-full blur-[120px]"
        style={{ background: "hsl(var(--accent) / 0.12)" }}
      />
    </div>
  );
}

export default CyanGlow;
