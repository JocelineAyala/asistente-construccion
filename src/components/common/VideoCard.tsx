import { Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type VideoCardProps = {
  imageLabel: string;
  title: string;
};

export function VideoCard({ imageLabel, title }: VideoCardProps) {
  return (
    <Card className="video-card">
      <div className="video-placeholder">{imageLabel}</div>
      <h2>{title}</h2>
      <Button
        type="button"
        variant="secondary"
        onClick={() => window.alert('Video placeholder. YouTube se conectara en una fase posterior.')}
      >
        <Play size={18} />
        Ver video
      </Button>
    </Card>
  );
}
