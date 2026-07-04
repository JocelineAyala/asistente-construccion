import { ElementType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';

type ProfileSelectorCardProps = {
  description: string;
  icon: ElementType;
  title: string;
  to: string;
};

export function ProfileSelectorCard({
  description,
  icon: Icon,
  title,
  to,
}: ProfileSelectorCardProps) {
  return (
    <Card className="profile-card">
      <div className="profile-card-icon">
        <Icon size={24} />
      </div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Link to={to} className="profile-card-link">
        Seleccionar
        <ArrowRight size={18} />
      </Link>
    </Card>
  );
}
