import { Check, ExternalLink } from 'lucide-react';
import { Card } from '../ui/Card';

type MaterialCardProps = {
  name: string;
  price?: number;
  store?: string;
  url?: string;
};

export function MaterialCard({ name, price, store, url }: MaterialCardProps) {
  const handleClick = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card 
      className="compact-card" 
      style={{ 
        cursor: url ? 'pointer' : 'default', 
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        height: '100%',
        justifyContent: 'space-between'
      }}
      onClick={url ? handleClick : undefined}
    >
      <div className="inline-card-content" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
          <Check size={18} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: '1.3' }}>{name}</span>
        </div>
        {url && <ExternalLink size={14} style={{ opacity: 0.6, flexShrink: 0, marginLeft: 'var(--space-1)' }} />}
      </div>
      
      {(price !== undefined || store) && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontSize: '0.8rem', 
          marginTop: 'var(--space-1)',
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-2)',
          width: '100%'
        }}>
          {store && <span style={{ opacity: 0.7 }}>🛒 {store}</span>}
          {price !== undefined && (
            <span style={{ 
              fontWeight: 700, 
              color: '#10b981', 
              background: 'rgba(16, 185, 129, 0.1)', 
              padding: '2px 6px', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              ${price.toFixed(2)} USD
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
