import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, FolderOpen, PencilRuler, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageTitle } from '../../components/common/PageTitle';
import { Card } from '../../components/ui/Card';
import { listUserProjects, isProjectCloudStorageEnabled } from '../../services/projectService';
import { SavedProject } from '../../types/project';
import { isFirebaseConfigured } from '../../lib/firebase';

const PROJECT_TYPE_LABELS: Record<SavedProject['projectType'], string> = {
  'floor-plan': 'Plano arquitectónico',
  consultation: 'Consulta',
  imperfection: 'Reparación',
};

export function ProjectHistoryPage() {
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setIsLoadingProjects(false);
      return;
    }

    setIsLoadingProjects(true);
    listUserProjects(user.uid)
      .then(setProjects)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'No se pudo cargar el historial.';
        setErrorMessage(message);
      })
      .finally(() => setIsLoadingProjects(false));
  }, [user]);

  if (loading) {
    return (
      <div className="page-grid sv-page-panel">
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-grid sv-page-panel">
        <PageTitle eyebrow="Historial" title="Tus proyectos guardados">
          <p>Inicia sesión con Google para ver y guardar proyectos vinculados a tu cuenta.</p>
        </PageTitle>
        <Card className="sv-section-card">
          <Link to="/login?redirect=/usuario/historial" className="button button-primary">
            Iniciar sesión
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-grid sv-page-panel">
      <PageTitle eyebrow="Historial" title="Proyectos de tu cuenta">
        <p>
          Proyectos guardados para <strong>{user.email}</strong>
          {user.provider === 'google' ? ' (Google)' : ' (modo local)'}.
          {!isProjectCloudStorageEnabled() ? (
            <>
              {' '}
              Los datos están en este navegador; conecta Firebase en <code>.env</code> para
              sincronizar con tu base de datos.
            </>
          ) : null}
        </p>
      </PageTitle>

      {!isFirebaseConfigured() ? (
        <Card className="sv-section-card project-history-storage-note">
          <p>
            <strong>Firebase no está configurado.</strong> El historial guarda el boceto y las
            medidas del plano (no un archivo 3D aparte) en el almacenamiento local del navegador.
            Debes pulsar <strong>Guardar proyecto</strong> en el mapeo del plano después de
            analizar.
          </p>
        </Card>
      ) : null}

      {errorMessage ? <p className="plan-error-message">{errorMessage}</p> : null}

      {isLoadingProjects ? (
        <Card className="sv-section-card">
          <p>Cargando proyectos...</p>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="sv-section-card project-history-empty">
          <FolderOpen size={32} />
          <h2>Aún no tienes proyectos guardados</h2>
          <p>
            Ve a <strong>Dibujar plano</strong> o crea una consulta y usa el botón{' '}
            <strong>Guardar proyecto</strong>.
          </p>
          <Link to="/usuario/dibujar-plano" className="button button-primary">
            Ir a dibujar plano
          </Link>
        </Card>
      ) : (
        <div className="project-history-list">
          {projects.map((project) => {
            const projectLink =
              project.projectType === 'floor-plan'
                ? `/usuario/dibujar-plano?projectId=${project.id}`
                : '/usuario/nueva-consulta';

            return (
              <Card key={project.id} className="sv-section-card project-history-item">
                <div className="project-history-item-copy">
                  <span className="eyebrow">{PROJECT_TYPE_LABELS[project.projectType]}</span>
                  <h2>{project.title}</h2>
                  <p>{project.summary || project.description || 'Proyecto guardado en tu cuenta.'}</p>
                  <span className="project-history-date">
                    <Clock3 size={14} />
                    {new Date(project.updatedAt).toLocaleString('es-SV')}
                  </span>
                </div>
                <Link to={projectLink} className="button button-secondary">
                  {project.projectType === 'floor-plan' ? (
                    <>
                      <PencilRuler size={16} /> Abrir plano
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Ver consulta
                    </>
                  )}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
