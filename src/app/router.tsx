import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AnalyzingPage } from './pages/AnalyzingPage';
import { HomeProfessionalPage } from './pages/HomeProfessionalPage';
import { HomeUserPage } from './pages/HomeUserPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NewConsultationPage } from './pages/NewConsultationPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlanMappingPage } from './pages/PlanMappingPage';
import { ProfileSelectionPage } from './pages/ProfileSelectionPage';
import { ProjectHistoryPage } from './pages/ProjectHistoryPage';
import { ResultsPage } from './pages/ResultsPage';
import { UserPlaceholderPage } from './pages/UserPlaceholderPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: '/seleccion-perfil',
        element: <ProfileSelectionPage />,
      },
      {
        path: '/home/usuario',
        element: <HomeUserPage />,
      },
      {
        path: '/usuario/nueva-consulta',
        element: <NewConsultationPage />,
      },
      {
        path: '/usuario/dibujar-plano',
        element: <PlanMappingPage />,
      },
      {
        path: '/usuario/analizando',
        element: <AnalyzingPage />,
      },
      {
        path: '/usuario/resultados',
        element: <ResultsPage />,
      },
      {
        path: '/usuario/historial',
        element: <ProjectHistoryPage />,
      },
      {
        path: '/usuario/materiales-sugeridos',
        element: (
          <UserPlaceholderPage
            title="Materiales sugeridos"
            description="Esta sección se alimentará con los materiales generados al analizar una consulta."
          />
        ),
      },
      {
        path: '/home/profesional',
        element: <HomeProfessionalPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
