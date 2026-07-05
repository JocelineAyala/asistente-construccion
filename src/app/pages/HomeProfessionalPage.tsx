import { AirVent, AudioWaveform, Lightbulb, Ruler } from 'lucide-react';
import { FeatureCard } from '../../components/common/FeatureCard';
import { PageTitle } from '../../components/common/PageTitle';
import { PROFESSIONAL_HOME_SECTIONS } from '../../constants/homeSections';

const PROFESSIONAL_SECTION_ICONS = [AudioWaveform, Lightbulb, AirVent, Ruler];
const PROFESSIONAL_SECTION_TONES = ['blue', 'yellow', 'green', 'red'] as const;

export function HomeProfessionalPage() {
  return (
    <div className="page-grid sv-page-panel">
      <PageTitle eyebrow="Usuario profesional" title="Herramientas profesionales">
        <p>
          Aquí habrá herramientas para análisis técnico, revisión de condiciones y apoyo
          profesional en decisiones de construcción.
        </p>
      </PageTitle>

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
