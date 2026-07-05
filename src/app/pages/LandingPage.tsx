import {
  ArrowRight,
  Camera,
  ClipboardList,
  Home,
  MapPin,
  PencilRuler,
  PackageCheck,
  Sparkles,
  Wind,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import blobBlue from '../../assets/decorations/blob-blue.svg';
import blobGreen from '../../assets/decorations/blob-green.svg';
import dots from '../../assets/decorations/dots.svg';
import leaves from '../../assets/decorations/leaves.svg';
import sun from '../../assets/decorations/sun.svg';
import waves from '../../assets/decorations/waves.svg';
import houseIllustration from '../../assets/illustrations/house.svg';
import { APP_NAME } from '../../constants/app';

const projectHighlights = [
  {
    icon: Camera,
    title: 'Cambios pequeños en construcción',
    description:
      'Para reparar un hoyo, mejorar ventilación, bajar la temperatura o resolver necesidades puntuales con una guía clara.',
  },
  {
    icon: PencilRuler,
    title: 'Dibujo de plano sencillo',
    description:
      'El usuario podrá crear un plano básico mientras la app lo guía para medir paredes, ventanas, puertas y espacios.',
  },
  {
    icon: PackageCheck,
    title: 'Materiales y pasos',
    description:
      'La app organizará materiales sugeridos, pasos de trabajo y recomendaciones prácticas según el tipo de consulta.',
  },
  {
    icon: MapPin,
    title: 'Contexto salvadoreño',
    description:
      'La experiencia está pensada para proyectos locales de construcción, con lenguaje cercano y apoyo visual paso a paso.',
  },
];

const normalUserPaths = [
  {
    icon: Wind,
    title: 'Modificar algo pequeño',
    description:
      'El usuario selecciona qué necesita mejorar, agrega información del espacio y recibe una guía práctica.',
  },
  {
    icon: ClipboardList,
    title: 'Hacer un plano',
    description:
      'La app lo acompaña paso a paso mientras mide, dibuja de forma sencilla y registra las partes importantes del lugar.',
  },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <img className="landing-blob-blue" src={blobBlue} alt="" aria-hidden="true" />
      <img className="landing-blob-green" src={blobGreen} alt="" aria-hidden="true" />
      <img className="landing-sun" src={sun} alt="" aria-hidden="true" />
      <img className="landing-waves" src={waves} alt="" aria-hidden="true" />
      <img className="landing-dots" src={dots} alt="" aria-hidden="true" />
      <img className="landing-leaves" src={leaves} alt="" aria-hidden="true" />

      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label={APP_NAME}>
          <span className="landing-brand-mark">
            <Home size={24} />
          </span>
          <span>{APP_NAME}</span>
        </Link>
        <Link to="/login" className="landing-nav-link">
          Entrar al prototipo
        </Link>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">Proyecto final</span>
          <h1>Una guía visual para mejorar, medir y planificar espacios en construcción y edificación</h1>
          <p>
            {APP_NAME} será una plataforma web para ayudar a personas a resolver mejoras en
            construcción y edificación y crear planos sencillos, con acompañamiento paso a paso, lenguaje claro y una
            experiencia visual inspirada en El Salvador.
          </p>
          <div className="landing-actions">
            <Link to="/login" className="button button-primary">
              Comenzar
              <ArrowRight size={18} />
            </Link>
            <Link to="/seleccion-perfil" className="button button-secondary">
              Ver perfiles
            </Link>
          </div>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <img src={houseIllustration} alt="" />
          <span className="landing-visual-badge">
            <Sparkles size={18} />
            Guía paso a paso
          </span>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="project-purpose">
        <div className="landing-section-heading">
          <span className="eyebrow">De qué tratará</span>
          <h2 id="project-purpose">Dos caminos para el usuario normal</h2>
          <p>
            El producto final permitirá elegir entre resolver cambios pequeños en construcción o crear
            un plano básico. En ambos casos, la app irá guiando al usuario para capturar la
            información necesaria de forma sencilla.
          </p>
        </div>

        <div className="landing-path-grid">
          {normalUserPaths.map(({ icon: Icon, title, description }) => (
            <article className="landing-path-card" key={title}>
              <span className="landing-highlight-icon">
                <Icon size={28} strokeWidth={1.9} />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="project-features">
        <div className="landing-section-heading">
          <span className="eyebrow">Funciones esperadas</span>
          <h2 id="project-features">Una experiencia práctica, visual y local</h2>
        </div>

        <div className="landing-highlight-grid">
          {projectHighlights.map(({ icon: Icon, title, description }) => (
            <article className="landing-highlight-card" key={title}>
              <span className="landing-highlight-icon">
                <Icon size={26} strokeWidth={1.9} />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-flow" aria-labelledby="landing-flow-title">
        <div>
          <span className="eyebrow">Experiencia final</span>
          <h2 id="landing-flow-title">De una necesidad a una guía accionable</h2>
        </div>
        <ol>
          <li>Elegir perfil</li>
          <li>Seleccionar cambio pequeño o plano</li>
          <li>Medir y registrar información con guía</li>
          <li>Revisar pasos, materiales y recomendaciones</li>
          <li>Guardar o continuar el proyecto</li>
        </ol>
      </section>
    </main>
  );
}
