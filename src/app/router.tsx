import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AnalyzingPage } from './pages/AnalyzingPage';
import { HomeProfessionalPage } from './pages/HomeProfessionalPage';
import { HomeUserPage } from './pages/HomeUserPage';
import { LoginPage } from './pages/LoginPage';
import { NewConsultationPage } from './pages/NewConsultationPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfileSelectionPage } from './pages/ProfileSelectionPage';
import { ResultsPage } from './pages/ResultsPage';
import { UserPlaceholderPage } from './pages/UserPlaceholderPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
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
            description="Aqui se mostraran las consultas realizadas por el usuario."
          />
        ),
      },
      {
        path: '/usuario/materiales-sugeridos',
        element: (
          <UserPlaceholderPage
            title="Materiales sugeridos"
            description="Esta seccion se alimentara con los materiales generados al analizar una consulta."
          />
        ),
      },
      {
        path: '/usuario/ferreterias-cercanas',
        element: (
          <UserPlaceholderPage
            title="Ferreterias cercanas"
            description="Aqui se listaran comercios cercanos cuando se conecte la ubicacion."
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
