import { MapPin } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type HardwareStoreCardProps = {
  distance: string;
  name: string;
};

export function HardwareStoreCard({ distance, name }: HardwareStoreCardProps) {
  return (
    <Card className="hardware-card">
      <div>
        <h2>{name}</h2>
        <p>{distance}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={() => window.alert('Ubicacion placeholder. Google Maps se conectara en una fase posterior.')}
      >
        <MapPin size={18} />
        Ver ubicacion
      </Button>
    </Card>
  );
}
