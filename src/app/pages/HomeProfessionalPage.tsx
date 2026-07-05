import { AirVent, ArrowRight, AudioWaveform, Box, Lightbulb, Ruler } from 'lucide-react';
import { FeatureCard } from '../../components/common/FeatureCard';
import { PageTitle } from '../../components/common/PageTitle';
import { Button } from '../../components/ui/Button';
import { PROFESSIONAL_HOME_SECTIONS } from '../../constants/homeSections';

const PROFESSIONAL_SECTION_ICONS = [AudioWaveform, Lightbulb, AirVent, Ruler];
const PROFESSIONAL_SECTION_TONES = ['blue', 'yellow', 'green', 'red'] as const;

export function HomeProfessionalPage() {
  return (
    <div className="page-grid sv-page-panel">
      <PageTitle eyebrow="Usuario profesional" title="Herramientas profesionales">
        <p>
          Accede a herramientas de análisis técnico, revisión de condiciones y apoyo
          profesional para tomar decisiones de construcción con más contexto.
        </p>
      </PageTitle>

      <section className="professional-plano3d-entry" aria-label="Herramienta Plano3D profesional">
        <div className="professional-plano3d-copy">
          <span className="professional-plano3d-icon" aria-hidden="true">
            <Box size={30} strokeWidth={1.8} />
          </span>
          <div>
            <p className="eyebrow">Herramienta integrada</p>
            <h2>Plano3D profesional</h2>
            <p>
              Convierte planos en un modelo 3D editable, ajusta muros, puertas y ventanas,
              revisa materiales y usa el modo profesional para sugerencias técnicas.
            </p>
          </div>
        </div>

        <Button as="a" href="/plano3d/index.html" variant="primary" className="professional-plano3d-button">
          Abrir Plano3D
          <ArrowRight size={18} />
        </Button>
      </section>

      <section className="feature-grid" aria-label="Secciones futuras para usuario profesional">
        {PROFESSIONAL_HOME_SECTIONS.map((section, index) => (
          <FeatureCard
            key={section.title}
            title={section.title}
            description={section.description}
            icon={PROFESSIONAL_SECTION_ICONS[index]}
            tone={PROFESSIONAL_SECTION_TONES[index]}
          />
        ))}
      </section>
    </div>
  );
}
