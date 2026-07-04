type SectionTitleProps = {
  description?: string;
  title: string;
};

export function SectionTitle({ description, title }: SectionTitleProps) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
