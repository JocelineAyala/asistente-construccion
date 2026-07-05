import { BriefcaseBusiness, UserRound } from 'lucide-react';
import { PageTitle } from '../../components/common/PageTitle';
import { ProfileCard } from '../../components/common/ProfileCard';

export function ProfileSelectionPage() {
  return (
    <div className="page-grid sv-page-panel">
      <PageTitle eyebrow="Selección de perfil" title="Elige cómo quieres continuar">
        <p>Selecciona el tipo de experiencia que quieres usar en esta sesión.</p>
      </PageTitle>

      <section className="profile-selector-grid" aria-label="Tipos de perfil">
        <ProfileCard
          title="Usuario normal"
          description="Para resolver necesidades del hogar con consultas simples, fotos y recomendaciones guiadas."
          icon={UserRound}
          to="/home/usuario"
          tone="normal"
        />
        <ProfileCard
          title="Usuario profesional"
          description="Para acceder a herramientas técnicas y módulos especializados de análisis."
          icon={BriefcaseBusiness}
          to="/home/profesional"
          tone="professional"
        />
      </section>
    </div>
  );
}
