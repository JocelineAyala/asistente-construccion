import { Link } from 'react-router-dom';
import { MobileShell } from '../../components/layout/MobileShell';
import { Button } from '../../components/ui/Button';

export function NotFoundPage() {
  return (
    <MobileShell>
      <section className="not-found-content">
        <span className="eyebrow">Error 404</span>
        <h1>Pagina no encontrada</h1>
        <p>Esta pantalla se muestra cuando la ruta solicitada no existe.</p>
        <Button as={Link} to="/login" fullWidth>
          Volver al login
        </Button>
      </section>
    </MobileShell>
  );
}
