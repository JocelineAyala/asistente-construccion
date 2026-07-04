import { Menu, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function Navbar() {
  return (
    <header className="navbar">
      <Button variant="ghost" size="icon" aria-label="Abrir menu">
        <Menu size={20} />
      </Button>

      <div className="navbar-search">
        <Input
          aria-label="Buscar"
          leftIcon={<Search size={18} />}
          placeholder="Buscar..."
        />
      </div>

      <Link to="/seleccion-perfil" className="navbar-user" aria-label="Cambiar perfil">
        <span>JA</span>
      </Link>
    </header>
  );
}
