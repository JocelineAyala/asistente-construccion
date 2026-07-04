import { Check } from 'lucide-react';
import { Card } from '../ui/Card';

type MaterialCardProps = {
  name: string;
};

export function MaterialCard({ name }: MaterialCardProps) {
  return (
    <Card className="compact-card">
      <div className="inline-card-content">
        <Check size={18} />
        <span>{name}</span>
      </div>
    </Card>
  );
}
