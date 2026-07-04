import { AirVent, AudioWaveform, Lightbulb, Ruler } from 'lucide-react';
import { ActionCard } from '../../components/common/ActionCard';
import { PageTitle } from '../../components/common/PageTitle';
import { PROFESSIONAL_HOME_SECTIONS } from '../../constants/homeSections';

const PROFESSIONAL_SECTION_ICONS = [AudioWaveform, Lightbulb, AirVent, Ruler];

export function HomeProfessionalPage() {
  return (
    <div className="page-grid">
      <PageTitle eyebrow="Usuario profesional" title="Herramientas profesionales">
        <p>
          Aqui habra herramientas para analisis tecnico, revision de condiciones y apoyo
          profesional en decisiones de construccion.
        </p>
      </PageTitle>

      <section className="feature-grid" aria-label="Secciones futuras para usuario profesional">
        {PROFESSIONAL_HOME_SECTIONS.map((section, index) => (
          <ActionCard
            key={section.title}
            title={section.title}
            description={section.description}
            icon={PROFESSIONAL_SECTION_ICONS[index]}
          />
        ))}
      </section>
    </div>
  );
}
