import { BriefcaseBusiness, UserRound } from 'lucide-react';
import { ProfileSelectorCard } from '../../components/common/ProfileSelectorCard';
import { PageTitle } from '../../components/common/PageTitle';

export function ProfileSelectionPage() {
  return (
    <div className="page-grid">
      <PageTitle eyebrow="Seleccion de perfil" title="Elige como quieres continuar">
        <p>Selecciona el tipo de experiencia que quieres usar en esta sesion.</p>
      </PageTitle>

      <section className="profile-selector-grid" aria-label="Tipos de perfil">
        <ProfileSelectorCard
          title="Usuario normal"
          description="Para resolver necesidades del hogar con consultas simples, fotos y recomendaciones guiadas."
          icon={UserRound}
          to="/home/usuario"
        />
        <ProfileSelectorCard
          title="Usuario profesional"
          description="Para acceder a herramientas tecnicas y modulos especializados de analisis."
          icon={BriefcaseBusiness}
          to="/home/profesional"
        />
      </section>
    </div>
  );
}
