import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import { MobileShell } from '../../components/layout/MobileShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { APP_NAME } from '../../constants/app';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/seleccion-perfil');
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
            <p>Entra al prototipo y elige la experiencia que quieres probar.</p>
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

            <Button type="submit" fullWidth>
              Iniciar sesión
            </Button>
          </form>
        </Card>
      </section>
    </MobileShell>
  );
}
