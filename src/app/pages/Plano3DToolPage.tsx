import { ArrowLeft, Box, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function Plano3DToolPage() {
  return (
    <div className="page-grid sv-page-panel plano3d-shell-page">
      <section className="plano3d-tool-header">
        <div className="plano3d-tool-copy">
          <span className="plano3d-tool-icon" aria-hidden="true">
            <Box size={28} strokeWidth={1.9} />
          </span>
          <div>
            <p className="eyebrow">Modo profesional</p>
            <h1>Plano3D</h1>
            <p>
              Analiza planos, ajusta muros, coloca puertas y ventanas, revisa materiales
              y explora sugerencias profesionales como ubicación de aire acondicionado.
            </p>
          </div>
        </div>

        <div className="plano3d-tool-actions">
          <Button as={Link} to="/home/profesional" variant="ghost">
            <ArrowLeft size={18} />
            Volver
          </Button>
          <Button as="a" href="/plano3d/index.html" variant="secondary">
            <ExternalLink size={18} />
            Abrir aparte
          </Button>
        </div>
      </section>

      <section className="plano3d-launch-card" aria-label="Abrir herramienta Plano3D">
        <div>
          <p className="eyebrow">Vista completa</p>
          <h2>Abrir Plano3D en pantalla completa</h2>
          <p>
            La herramienta conserva sus controles originales y se abre fuera del marco de la app
            para aprovechar todo el espacio de edición.
          </p>
        </div>
        <Button as="a" href="/plano3d/index.html" variant="primary">
          Abrir aparte
          <ExternalLink size={18} />
        </Button>
      </section>
    </div>
  );
}
