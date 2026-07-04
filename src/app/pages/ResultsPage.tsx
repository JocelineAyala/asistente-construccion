import { Link } from 'react-router-dom';
import { HardwareStoreCard } from '../../components/common/HardwareStoreCard';
import { MaterialCard } from '../../components/common/MaterialCard';
import { PageTitle } from '../../components/common/PageTitle';
import { SectionTitle } from '../../components/common/SectionTitle';
import { StepCard } from '../../components/common/StepCard';
import { VideoCard } from '../../components/common/VideoCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  MOCK_HARDWARE_STORES,
  MOCK_MATERIALS,
  MOCK_STEPS,
  MOCK_VIDEOS,
} from '../../constants/mockResults';

export function ResultsPage() {
  return (
    <div className="page-grid">
      <PageTitle eyebrow="Resultados" title="Recomendacion preliminar">
        <p>Contenido mock para validar el flujo antes de integrar IA, backend o APIs.</p>
      </PageTitle>

      <Card className="result-card">
        <SectionTitle title="Diagnostico" />
        <p>
          Se detecta una pared expuesta al sol durante gran parte del dia, lo que puede
          aumentar la temperatura del espacio.
        </p>
      </Card>

      <section className="page-grid" id="materiales">
        <SectionTitle title="Materiales sugeridos" />
        <div className="material-grid">
          {MOCK_MATERIALS.map((material) => (
            <MaterialCard key={material} name={material} />
          ))}
        </div>
      </section>

      <section className="page-grid">
        <SectionTitle title="Paso a paso" />
        <div className="step-grid">
          {MOCK_STEPS.map((step, index) => (
            <StepCard key={step} step={step} stepNumber={index + 1} />
          ))}
        </div>
      </section>

      <section className="page-grid">
        <SectionTitle title="Videos recomendados" />
        <div className="video-grid">
          {MOCK_VIDEOS.map((video) => (
            <VideoCard key={video.title} {...video} />
          ))}
        </div>
      </section>

      <section className="page-grid" id="ferreterias">
        <SectionTitle title="Ferreterias cercanas" />
        <div className="hardware-grid">
          {MOCK_HARDWARE_STORES.map((store) => (
            <HardwareStoreCard key={store.name} {...store} />
          ))}
        </div>
      </section>

      <div className="form-actions">
        <Button as={Link} to="/home/usuario" fullWidth>
          Volver al inicio
        </Button>
        <Button as={Link} to="/usuario/nueva-consulta" variant="secondary" fullWidth>
          Iniciar otra consulta
        </Button>
      </div>
    </div>
  );
}
