import { Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type VideoCardProps = {
  imageLabel: string;
  title: string;
  url?: string;
};

export function VideoCard({ imageLabel, title, url }: VideoCardProps) {
  const handlePlay = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const searchQuery = encodeURIComponent(title);
      window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="video-card">
      <div className="video-placeholder">{imageLabel}</div>
      <h2>{title}</h2>
      <Button
        type="button"
        variant="secondary"
        onClick={handlePlay}
      >
        <Play size={18} />
        Ver video
      </Button>
    </Card>
  );
}
