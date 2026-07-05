import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Chrome, HardHat } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MobileShell } from '../../components/layout/MobileShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { isFirebaseConfigured } from '../../lib/firebase';
import { APP_NAME } from '../../constants/app';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/home/usuario';
  const { signInWithGoogle, signInLocally, isGoogleAuthAvailable } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await signInWithGoogle();
      navigate(redirectTo);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'No se pudo iniciar sesión con Google.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    signInLocally(email);
    navigate(redirectTo);
  };

  return (
    <MobileShell showHeader={false} className="auth-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-mark" aria-hidden="true">
            <HardHat size={34} />
          </span>
          <div>
            <span className="eyebrow">Bienvenido</span>
            <h1 id="login-title">{APP_NAME}</h1>
          </div>
        </div>

        <Card className="login-card">
          <div className="section-heading">
            <h2>Inicia sesión</h2>
            <p>
              Usa Google para guardar proyectos en tu cuenta y consultarlos en el historial.
            </p>
          </div>

          {isGoogleAuthAvailable ? (
            <div className="login-google-block">
              <Button
                type="button"
                fullWidth
                variant="secondary"
                className="login-google-btn"
                disabled={isSubmitting}
                onClick={handleGoogleSignIn}
              >
                <Chrome size={18} />
                Continuar con Google
              </Button>
            </div>
          ) : (
            <div className="chat-info-banner">
              <p>
                Para Google Sign-In agrega las variables <code>VITE_FIREBASE_*</code> en tu{' '}
                <code>.env</code>. Mientras tanto puedes usar el acceso local de prototipo.
              </p>
            </div>
          )}

          <div className="login-divider">
            <span>o accede al prototipo</span>
          </div>

          <form className="stack" onSubmit={handleSubmit} noValidate>
            <Input
              label="Correo"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@correo.com"
              autoComplete="email"
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="current-password"
            />

            <div className="login-actions">
              <Link to="/seleccion-perfil">Olvidé mi contraseña</Link>
            </div>

            <Button type="submit" fullWidth disabled={isSubmitting}>
              Entrar al prototipo
            </Button>
          </form>

          {errorMessage ? <p className="plan-error-message">{errorMessage}</p> : null}

          {!isFirebaseConfigured() ? (
            <p className="login-footnote">
              Modo local: los proyectos se guardan en este navegador con tu correo de prototipo.
            </p>
          ) : null}
        </Card>
      </section>
    </MobileShell>
  );
}
