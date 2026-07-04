import { Clock3, Hammer, MapPin, PackageCheck } from 'lucide-react';
import { ActionCard } from '../../components/common/ActionCard';
import { PageTitle } from '../../components/common/PageTitle';
import { USER_HOME_SECTIONS } from '../../constants/homeSections';

const USER_SECTION_ICONS = [Hammer, Clock3, PackageCheck, MapPin];

export function HomeUserPage() {
  return (
    <div className="page-grid">
      <PageTitle eyebrow="Usuario normal" title="Asistente para el hogar">
        <p>
          Aqui el usuario podra subir fotos, describir arreglos y recibir recomendaciones
          practicas para resolver necesidades del hogar.
        </p>
      </PageTitle>

      <section className="feature-grid" aria-label="Secciones futuras para usuario normal">
        {USER_HOME_SECTIONS.map((section, index) => (
          <ActionCard
            key={section.title}
            title={section.title}
            description={section.description}
            icon={USER_SECTION_ICONS[index]}
            to={section.path}
          />
        ))}
      </section>
    </div>
  );
}
