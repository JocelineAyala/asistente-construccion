import { ElementType } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';

type ActionCardProps = {
  description: string;
  icon: LucideIcon;
  title: string;
  to?: string;
};

export function ActionCard({ description, icon: Icon, title, to }: ActionCardProps) {
  const Component: ElementType = to ? Link : 'div';

  return (
    <Card as={Component} to={to} className="action-card">
      <span className="action-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </Card>
  );
}
