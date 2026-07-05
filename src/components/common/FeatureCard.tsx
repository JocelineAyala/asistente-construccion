import { Link } from 'react-router-dom';
import { ArrowRight, LucideIcon } from 'lucide-react';

type FeatureCardProps = {
  description: string;
  icon: LucideIcon;
  title: string;
  to?: string;
  tone?: 'blue' | 'green' | 'lime' | 'yellow' | 'red';
};

export function FeatureCard({
  description,
  icon: Icon,
  title,
  to,
  tone = 'blue',
}: FeatureCardProps) {
  const content = (
    <>
      <span className="sv-feature-icon" aria-hidden="true">
        <Icon size={30} strokeWidth={1.8} />
      </span>
      <span className="sv-feature-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="sv-feature-arrow" aria-hidden="true">
        <ArrowRight size={22} />
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`sv-feature-card tone-${tone}`}>
        {content}
      </Link>
    );
  }

  return (
    <article className={`sv-feature-card tone-${tone}`}>
      {content}
    </article>
  );
}
