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
  // Try to load dynamic OpenAI or simulated result from localStorage
  const rawResult = localStorage.getItem('buildassist:last-result');
  let result = null;

  if (rawResult) {
    try {
      result = JSON.parse(rawResult);
    } catch (e) {
      console.error('Error parsing dynamic result', e);
    }
  }

  // Determine which data to render
  const diagnostico = result?.diagnostico || 'Se detecta una pared expuesta al sol durante gran parte del dia, lo que puede aumentar la temperatura del espacio.';
  const materials = result?.materials || MOCK_MATERIALS;
  const steps = result?.steps || MOCK_STEPS;
  const videos = result?.videos || MOCK_VIDEOS;
  const hardwareStores = result?.hardwareStores || MOCK_HARDWARE_STORES;

  // Try to load project details (containing the uploaded image and budget) from localStorage
  const rawProject = localStorage.getItem('buildassist:last-project');
  let project = null;
  if (rawProject) {
    try {
      project = JSON.parse(rawProject);
    } catch (e) {
      console.error('Error parsing project details', e);
    }
  }
  const imagePreview = project?.imagePreview;
  const damageBudget = project?.damageBudget;

  return (
    <div className="page-grid">
      <PageTitle 
        eyebrow="Resultados" 
        title={result ? 'Recomendación Inteligente de IA' : 'Recomendacion preliminar'}
      >
        <p>
          {result 
            ? 'Análisis en tiempo real procesado por el Asistente de IA.' 
            : 'Contenido mock para validar el flujo antes de integrar IA, backend o APIs.'}
        </p>
      </PageTitle>

      <Card className="result-card">
        <SectionTitle title="Diagnostico" />
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 'var(--space-2)' }}>
          <div style={{ flex: '1', minWidth: '280px' }}>
            {damageBudget && (
              <div style={{ 
                display: 'inline-block', 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: '#10b981', 
                padding: 'var(--space-1) var(--space-2)', 
                borderRadius: 'var(--radius-sm)', 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                marginBottom: 'var(--space-2)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                💵 Presupuesto del Proyecto: ${damageBudget} USD
              </div>
            )}
            <p style={{ lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-line', margin: 0 }}>{diagnostico}</p>
          </div>
          {imagePreview && (
            <div style={{ 
              width: '180px', 
              height: '180px', 
              borderRadius: 'var(--radius-md)', 
              overflow: 'hidden', 
              border: '1px solid var(--color-border)', 
              background: 'var(--color-surface-hover)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <img 
                src={imagePreview} 
                alt="Foto del daño analizado" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          )}
        </div>
      </Card>

      <section className="page-grid" id="materiales">
        <SectionTitle title="Materiales sugeridos" />
        <div className="material-grid">
          {materials.map((material: any, index: number) => {
            const matObj = typeof material === 'string' ? { name: material } : material;
            return (
              <MaterialCard 
                key={index} 
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
        <SectionTitle title="Ferreterias cercanas" />
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
