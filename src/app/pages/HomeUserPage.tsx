import { Box, Clock3, MapPin, Plus } from 'lucide-react';
import { FeatureCard } from '../../components/common/FeatureCard';
import { PageTitle } from '../../components/common/PageTitle';
import { QuickArchitectChat } from '../../components/common/QuickArchitectChat';
import houseIllustration from '../../assets/illustrations/house.svg';
import { USER_HOME_SECTIONS } from '../../constants/homeSections';

const USER_SECTION_ICONS = [Plus, Clock3, Box, MapPin];
const USER_SECTION_TONES = ['blue', 'green', 'lime', 'yellow'] as const;

export function HomeUserPage() {
  return (
    <div className="page-grid sv-page-panel sv-home-page">
      <section className="sv-hero">
        <PageTitle eyebrow="Inicio" title="Asistente de construcción y edificación">
          <span className="sv-title-accent" aria-hidden="true" />
          <p>
            Tu asesor arquitectónico está listo para orientarte. Cuéntale qué necesitas o
            elige una opción abajo para iniciar un proyecto.
          </p>
        </PageTitle>
        <img className="sv-hero-house" src={houseIllustration} alt="" aria-hidden="true" />
      </section>

      <QuickArchitectChat />

      <section className="feature-grid" aria-label="Secciones para usuario normal">
        {USER_HOME_SECTIONS.map((section, index) => (
          <FeatureCard
            key={section.title}
            title={section.title}
            description={section.description}
            icon={USER_SECTION_ICONS[index]}
            to={section.path}
            tone={USER_SECTION_TONES[index]}
          />
        ))}
      </section>
    </div>
  );
}
