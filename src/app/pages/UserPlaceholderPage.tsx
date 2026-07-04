import { Link } from 'react-router-dom';
import { PageTitle } from '../../components/common/PageTitle';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

type UserPlaceholderPageProps = {
  description: string;
  title: string;
};

export function UserPlaceholderPage({ description, title }: UserPlaceholderPageProps) {
  return (
    <div className="page-grid">
      <PageTitle eyebrow="Modulo en preparacion" title={title}>
        <p>{description}</p>
      </PageTitle>

      <Card className="placeholder-card">
        <p>Esta pantalla queda reservada para una fase posterior del producto.</p>
        <div className="form-actions">
          <Button as={Link} to="/home/usuario" fullWidth>
            Volver al inicio
          </Button>
        </div>
      </Card>
    </div>
  );
}
