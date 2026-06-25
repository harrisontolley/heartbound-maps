/** Uppercase eyebrow label (caption-uppercase token from DESIGN.md). */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] font-semibold uppercase tracking-[0.96px] text-muted">
      {children}
    </span>
  );
}
