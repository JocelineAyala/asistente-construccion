import { Box, Clock3, MapPin, Plus } from 'lucide-react';
import { FeatureCard } from '../../components/common/FeatureCard';
import { PageTitle } from '../../components/common/PageTitle';
import houseIllustration from '../../assets/illustrations/house.svg';
import { USER_HOME_SECTIONS } from '../../constants/homeSections';

const USER_SECTION_ICONS = [Plus, Clock3, Box, MapPin];
const USER_SECTION_TONES = ['blue', 'green', 'lime', 'yellow'] as const;

export function HomeUserPage() {
  return (
    <div className="page-grid sv-page-panel">
      <section className="sv-hero">
        <PageTitle eyebrow="Usuario normal" title="Asistente para el hogar">
          <span className="sv-title-accent" aria-hidden="true" />
          <p>
            Aquí el usuario podrá subir fotos, describir arreglos y recibir recomendaciones
            prácticas para resolver necesidades del hogar.
          </p>
        </PageTitle>
        <img className="sv-hero-house" src={houseIllustration} alt="" aria-hidden="true" />
      </section>

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
