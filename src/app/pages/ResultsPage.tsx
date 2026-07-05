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
  const rawResult = localStorage.getItem('buildassist:last-result');
  let result = null;

  if (rawResult) {
    try {
      result = JSON.parse(rawResult);
    } catch (error) {
      console.error('Error parsing dynamic result', error);
    }
  }

  const diagnostico =
    result?.diagnostico ||
    'Se detecta una pared expuesta al sol durante gran parte del día, lo que puede aumentar la temperatura del espacio.';
  const materials = result?.materials || MOCK_MATERIALS;
  const steps = result?.steps || MOCK_STEPS;
  const videos = result?.videos || MOCK_VIDEOS;
  const hardwareStores = result?.hardwareStores || MOCK_HARDWARE_STORES;

  const rawProject = localStorage.getItem('buildassist:last-project');
  let project = null;

  if (rawProject) {
    try {
      project = JSON.parse(rawProject);
    } catch (error) {
      console.error('Error parsing project details', error);
    }
  }

  const imagePreview = project?.imagePreview;
  const damageBudget = project?.damageBudget;

  return (
    <div className="page-grid sv-page-panel">
      <PageTitle
        eyebrow="Resultados"
        title={result ? 'Recomendación inteligente' : 'Recomendación preliminar'}
      >
        <p>
          {result
            ? 'Análisis generado con los datos capturados en la consulta.'
            : 'Contenido mock para validar el flujo antes de integrar IA, backend o APIs.'}
        </p>
      </PageTitle>

      <Card className="result-card">
        <SectionTitle title="Diagnóstico" />
        <div className="result-summary">
          <div className="result-summary-copy">
            {damageBudget ? (
              <span className="result-budget">
                Presupuesto estimado: ${damageBudget} USD
              </span>
            ) : null}
            <p>{diagnostico}</p>
          </div>

          {imagePreview ? (
            <div className="result-image-preview">
              <img src={imagePreview} alt="Foto del daño analizado" />
            </div>
          ) : null}
        </div>
      </Card>

      <section className="page-grid" id="materiales">
        <SectionTitle title="Materiales sugeridos" />
        <div className="material-grid">
          {materials.map((material: any, index: number) => {
            const matObj = typeof material === 'string' ? { name: material } : material;

            return (
              <MaterialCard
                key={`${matObj.name}-${index}`}
                name={matObj.name}
                price={matObj.price}
                store={matObj.store}
                url={matObj.url}
              />
            );
          })}
        </div>
      </section>

      <section className="page-grid">
        <SectionTitle title="Paso a paso" />
        <div className="step-grid">
          {steps.map((step: string, index: number) => (
            <StepCard key={step} step={step} stepNumber={index + 1} />
          ))}
        </div>
      </section>

      <section className="page-grid">
        <SectionTitle title="Videos recomendados" />
        <div className="video-grid">
          {videos.map((video: any) => (
            <VideoCard key={video.title} {...video} />
          ))}
        </div>
      </section>

      <section className="page-grid" id="ferreterias">
        <SectionTitle title="Ferreterías cercanas" />
        <div className="hardware-grid">
          {hardwareStores.map((store: any) => (
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
