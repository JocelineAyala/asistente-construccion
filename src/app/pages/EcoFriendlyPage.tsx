import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Lightbulb, Sun, Wind } from 'lucide-react';
import { EcoFriendlyModel3D } from '../../components/common/EcoFriendlyModel3D';
import { EcoLayerPicker } from '../../components/common/EcoLayerPicker';
import { PageTitle } from '../../components/common/PageTitle';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  DEFAULT_ECO_LAYERS,
  EcoFriendlySession,
  EcoViewLayers,
  hasAnyEcoLayer,
} from '../../types/ecoAnalysis';
import { loadEcoFriendlySession, saveEcoFriendlySession } from '../../utils/analyzeEcoPlan';

export function EcoFriendlyPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<EcoFriendlySession | null>(null);
  const [activeLayers, setActiveLayers] = useState<EcoViewLayers>(DEFAULT_ECO_LAYERS);

  useEffect(() => {
    const loaded = loadEcoFriendlySession();
    if (!loaded) {
      navigate('/usuario/nueva-consulta', { replace: true });
      return;
    }
    setSession(loaded);
    setActiveLayers(loaded.activeLayers ?? DEFAULT_ECO_LAYERS);
  }, [navigate]);

  const handleLayersChange = (layers: EcoViewLayers) => {
    if (!hasAnyEcoLayer(layers)) return;
    setActiveLayers(layers);
    if (session) {
      saveEcoFriendlySession({ ...session, activeLayers: layers });
    }
  };

  if (!session) {
    return (
      <div className="page-grid sv-page-panel">
        <p>Cargando análisis ecofriendly...</p>
      </div>
    );
  }

  const { plan, analysis, sketchPreview, projectTitle } = session;

  return (
    <div className="page-grid sv-page-panel eco-friendly-page">
      <PageTitle eyebrow="EcoFriendly" title="Tu análisis personalizado en 3D">
        <p>
          {projectTitle ? `Plano: ${projectTitle}. ` : ''}
          Activa o desactiva capas para ver solo lo que te interesa.
        </p>
      </PageTitle>

      <Card className="sv-section-card eco-layer-card">
        <EcoLayerPicker layers={activeLayers} onChange={handleLayersChange} legend />
      </Card>

      <div className="eco-friendly-workspace">
        <div className="eco-friendly-details">
          <Card className="sv-section-card">
            <SectionTitle title="Resumen" />
            <p>{analysis.summary}</p>
          </Card>

          {activeLayers.ventilacion ? (
            <Card className="sv-section-card eco-benefit-card eco-benefit-vent">
              <div className="eco-benefit-heading">
                <Wind size={18} />
                <h3>Ventilación</h3>
              </div>
              <p>{analysis.ventilationBenefits}</p>
              <ul className="eco-point-list">
                {analysis.ventilationPoints.map((point) => (
                  <li key={point.id}>
                    <strong>{point.label}</strong> — {point.benefit}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {activeLayers.viento ? (
            <Card className="sv-section-card eco-benefit-card eco-benefit-wind">
              <div className="eco-benefit-heading">
                <Wind size={18} />
                <h3>Viento y aire cruzado</h3>
              </div>
              <p>
                Las líneas azules en el modelo muestran cómo entraría y saldría el aire entre
                aberturas opuestas, refrescando los cuartos sin encender ventiladores.
              </p>
              <ul className="eco-point-list">
                {analysis.ventilationPoints.slice(0, 3).map((point) => (
                  <li key={`wind-${point.id}`}>
                    Flujo desde <strong>{point.label}</strong>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {activeLayers.luz ? (
            <Card className="sv-section-card eco-benefit-card eco-benefit-light">
              <div className="eco-benefit-heading">
                <Lightbulb size={18} />
                <h3>Luz natural</h3>
              </div>
              <p>{analysis.lightBenefits}</p>
              <ul className="eco-point-list">
                {analysis.lightPoints.map((point) => (
                  <li key={point.id}>
                    <strong>{point.label}</strong> — {point.benefit}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {activeLayers.ventanas ? (
            <Card className="sv-section-card eco-benefit-card eco-benefit-reflect">
              <div className="eco-benefit-heading">
                <Sun size={18} />
                <h3>Ventanas reflectantes</h3>
              </div>
              <p>{analysis.reflectiveWindowNote}</p>
              <ul className="eco-point-list">
                {analysis.reflectiveWindows.map((point) => (
                  <li key={point.id}>
                    <strong>{point.label}</strong> — {point.benefit}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="sv-section-card eco-benefit-card eco-benefit-energy">
            <div className="eco-benefit-heading">
              <Leaf size={18} />
              <h3>Ahorro energético</h3>
            </div>
            <p>{analysis.energySavings}</p>
            <ul className="eco-point-list">
              {analysis.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="eco-friendly-viewer">
          <Card className="sv-section-card eco-viewer-card">
            <SectionTitle title="Vista 3D interactiva" />
            <p className="eco-viewer-legend">
              {activeLayers.ventilacion ? (
                <span className="eco-legend-item eco-legend-vent">Azul — ventilación</span>
              ) : null}
              {activeLayers.viento ? (
                <span className="eco-legend-item eco-legend-wind">Líneas — viento</span>
              ) : null}
              {activeLayers.luz ? (
                <span className="eco-legend-item eco-legend-light">Amarillo — luz</span>
              ) : null}
              {activeLayers.ventanas ? (
                <span className="eco-legend-item eco-legend-reflect">Cian — ventanas</span>
              ) : null}
            </p>
            <EcoFriendlyModel3D
              plan={plan}
              analysis={analysis}
              activeLayers={activeLayers}
              sketchPreview={sketchPreview}
            />
            <p className="eco-viewer-hint">Arrastra para rotar el modelo.</p>
          </Card>
        </div>
      </div>

      <div className="form-actions">
        <Button as={Link} to="/home/usuario" fullWidth>
          Volver al inicio
        </Button>
        <Button as={Link} to="/usuario/nueva-consulta" variant="secondary" fullWidth>
          Nuevo análisis
        </Button>
      </div>
    </div>
  );
}
