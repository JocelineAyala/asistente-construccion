import { Link } from 'react-router-dom';
import { ArrowRight, LucideIcon } from 'lucide-react';

type ProfileCardProps = {
  description: string;
  icon: LucideIcon;
  title: string;
  to: string;
  tone?: 'normal' | 'professional';
};

export function ProfileCard({
  description,
  icon: Icon,
  title,
  to,
  tone = 'normal',
}: ProfileCardProps) {
  return (
    <Link to={to} className={`sv-profile-card ${tone}`}>
      <span className="sv-profile-icon" aria-hidden="true">
        <Icon size={34} strokeWidth={1.8} />
      </span>
      <span className="sv-profile-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="sv-profile-action">
        Seleccionar
        <ArrowRight size={18} />
      </span>
    </Link>
  );
}
