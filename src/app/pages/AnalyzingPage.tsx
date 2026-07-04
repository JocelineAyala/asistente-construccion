import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../../components/common/LoadingScreen';

export function AnalyzingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      navigate('/usuario/resultados');
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [navigate]);

  return (
    <LoadingScreen label="Analizando tu espacio...">
      <p>Estamos preparando un resultado de ejemplo para este prototipo.</p>
    </LoadingScreen>
  );
}
