interface SectionHeaderProps {
  label?: string;
  heading: string;
  description?: string;
}

export default function SectionHeader({ label, heading, description }: SectionHeaderProps) {
  return (
    <div className="text-center mb-12">
      {label && (
        <span className="text-xs tracking-[0.2em] text-accent uppercase mb-2 block font-semibold">
          {label}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-4">
        {heading}
      </h2>
      {description && (
        <p className="text-secondary max-w-md mx-auto text-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
