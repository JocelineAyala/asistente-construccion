import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AnalyzingPage } from './pages/AnalyzingPage';
import { HomeProfessionalPage } from './pages/HomeProfessionalPage';
import { HomeUserPage } from './pages/HomeUserPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NewConsultationPage } from './pages/NewConsultationPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Plano3DToolPage } from './pages/Plano3DToolPage';
import { ProfileSelectionPage } from './pages/ProfileSelectionPage';
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
        path: '/usuario/analizando',
        element: <AnalyzingPage />,
      },
      {
        path: '/usuario/resultados',
        element: <ResultsPage />,
      },
      {
        path: '/usuario/historial',
        element: (
          <UserPlaceholderPage
            title="Historial"
            description="Aquí se mostrarán las consultas realizadas por el usuario."
          />
        ),
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
        path: '/usuario/ferreterias-cercanas',
        element: (
          <UserPlaceholderPage
            title="Ferreterías cercanas"
            description="Aquí se listarán comercios cercanos cuando se conecte la ubicación."
          />
        ),
      },
      {
        path: '/home/profesional',
        element: <HomeProfessionalPage />,
      },
      {
        path: '/home/profesional/plano3d',
        element: <Plano3DToolPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
