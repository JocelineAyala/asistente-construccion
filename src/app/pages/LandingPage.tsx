import {
  ArrowRight,
  BookOpen,
  Bot,
  BrickWall,
  Camera,
  Droplets,
  Fence,
  Hammer,
  Home,
  House,
  Layers,
  Lightbulb,
  PaintBucket,
  PackageCheck,
  PanelTop,
  Sparkles,
  SquareStack,
  Sun as SunIcon,
  ThermometerSun,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import blobBlue from '../../assets/decorations/blob-blue.svg';
import blobGreen from '../../assets/decorations/blob-green.svg';
import dots from '../../assets/decorations/dots.svg';
import leaves from '../../assets/decorations/leaves.svg';
import sun from '../../assets/decorations/sun.svg';
import waves from '../../assets/decorations/waves.svg';
import houseIllustration from '../../assets/illustrations/house.svg';
import logo from '../../assets/logo.svg';
import { APP_NAME } from '../../constants/app';

const painPoints = [
  {
    icon: BrickWall,
    title: 'Una pequena grieta termino siendo un problema mayor.',
    description:
      'Muchas reparaciones se retrasan porque no siempre es facil saber que hacer o como comenzar.',
  },
  {
    icon: Droplets,
    title: 'Las filtraciones vuelven cada invierno.',
    description: 'Muchas veces solo se cubre el dano visible sin resolver la causa.',
  },
  {
    icon: SunIcon,
    title: 'Tu casa se siente demasiado caliente.',
    description:
      'Existen soluciones sencillas que pueden mejorar el confort dentro del hogar.',
  },
  {
    icon: PackageCheck,
    title: 'No sabes que materiales comprar.',
    description: 'Elegir materiales adecuados puede ahorrar tiempo y dinero.',
  },
];

const reasons = [
  {
    value: '69%',
    title: 'con poca o ninguna inversion',
    description:
      'Entre propietarios del quintil de ingresos mas bajo, la mayoria invirtio poco o nada en mejoras o mantenimiento durante 2023.',
    source: 'Harvard Joint Center for Housing Studies',
  },
  {
    value: '1.2-3.3 C',
    title: 'menos dentro de la vivienda',
    description:
      'En viviendas sin aire acondicionado, los techos frios pueden reducir las temperaturas interiores maximas.',
    source: 'US EPA',
  },
  {
    value: '17 C',
    title: 'de diferencia entre superficies',
    description:
      'Berkeley Lab muestra que una superficie clara puede mantenerse mucho mas fresca que una oscura bajo el sol.',
    source: 'Lawrence Berkeley National Laboratory',
  },
  {
    value: '1 foto',
    title: 'es suficiente para comenzar',
    description:
      'Con solo una imagen, la aplicacion puede iniciar el analisis del problema y brindar orientacion personalizada.',
    source: 'Funcionalidad de la aplicacion',
  },
];

const helpSteps = [
  {
    icon: Camera,
    title: 'Sube una fotografia',
    description: 'Analiza el estado de una zona de tu vivienda.',
  },
  {
    icon: Bot,
    title: 'Obtén una explicación sencilla',
    description:
      'La IA identifica posibles causas y explica el problema con un lenguaje facil de entender.',
  },
  {
    icon: Lightbulb,
    title: 'Recibe recomendaciones',
    description:
      'Sugiere materiales, alternativas y posibles soluciones adaptadas a tu situacion.',
  },
];

const realHomeItems = [
  { icon: BrickWall, title: 'Grietas' },
  { icon: Droplets, title: 'Humedad' },
  { icon: Hammer, title: 'Filtraciones' },
  { icon: PanelTop, title: 'Techos' },
  { icon: SquareStack, title: 'Paredes' },
  { icon: Layers, title: 'Pisos' },
  { icon: PaintBucket, title: 'Pintura' },
  { icon: Fence, title: 'Cercas' },
  { icon: House, title: 'Fachadas' },
];

const familyValues = [
  {
    icon: Wallet,
    title: 'Cuidamos tu presupuesto',
    description: 'Sugerimos alternativas cuando existen opciones mas accesibles.',
  },
  {
    icon: ThermometerSun,
    title: 'Consideramos el clima',
    description: 'Las recomendaciones toman en cuenta el calor y la humedad.',
  },
  {
    icon: BookOpen,
    title: 'Explicaciones sencillas',
    description: 'Sin lenguaje tecnico complicado.',
  },
  {
    icon: Home,
    title: 'Cada hogar es diferente',
    description: 'Las recomendaciones se adaptan al problema observado.',
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
            <img src={logo} alt="" />
          </span>
          <span>{APP_NAME}</span>
        </Link>
        <Link to="/login" className="landing-nav-link">
          Entrar al prototipo
        </Link>
      </header>

      <section className="landing-hero landing-fade-up">
        <div className="landing-copy">
          <span className="eyebrow">Kroma</span>
          <h1>Tu hogar merece soluciones, no improvisaciones.</h1>
          <p>
            Una pequena grieta, una gotera o una habitacion demasiado caliente pueden convertirse
            en un gran problema. Kroma te ayuda a encontrar soluciones practicas, economicas y
            adaptadas a tu hogar.
          </p>
          <div className="landing-actions">
            <Link to="/login" className="button button-primary">
              Comenzar analisis
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
            Guia paso a paso
          </span>
        </div>
      </section>

      <section className="landing-section landing-fade-up" aria-labelledby="landing-problems">
        <div className="landing-section-heading">
          <span className="eyebrow">Te ha pasado?</span>
          <h2 id="landing-problems">Te ha pasado alguna de estas situaciones?</h2>
        </div>

        <div className="landing-highlight-grid">
          {painPoints.map(({ icon: Icon, title, description }) => (
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

      <section className="landing-section landing-fade-up" aria-labelledby="landing-reasons">
        <div className="landing-section-heading">
          <span className="eyebrow">Contexto real</span>
          <h2 id="landing-reasons">La realidad de la vivienda</h2>
          <p>
            Detras de muchas reparaciones hay una realidad que comparten millones de familias.
            Estos datos muestran por que tomar decisiones informadas al construir o reparar un
            hogar puede marcar la diferencia.
          </p>
        </div>

        <div className="landing-reason-grid">
          {reasons.map(({ value, title, description, source }) => (
            <article className="landing-reason-card" key={title}>
              <strong className="landing-reason-number">{value}</strong>
              <h3>{title}</h3>
              <p>{description}</p>
              <span>Fuente: {source}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-center-story landing-fade-up">
        <div>
          <span className="eyebrow">Orientacion antes de remodelar</span>
          <h2>No todos los hogares necesitan una remodelacion.</h2>
          <p>A veces solo necesitan la orientacion correcta para tomar mejores decisiones.</p>
        </div>
        <img src={houseIllustration} alt="" aria-hidden="true" />
      </section>

      <section className="landing-section landing-fade-up" aria-labelledby="landing-help">
        <div className="landing-section-heading">
          <span className="eyebrow">Proceso simple</span>
          <h2 id="landing-help">Como puede ayudarte?</h2>
        </div>

        <div className="landing-path-grid">
          {helpSteps.map(({ icon: Icon, title, description }) => (
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

      <section className="landing-section landing-fade-up" aria-labelledby="landing-real-homes">
        <div className="landing-section-heading">
          <span className="eyebrow">Viviendas reales</span>
          <h2 id="landing-real-homes">Pensado para viviendas reales</h2>
        </div>

        <div className="landing-mini-grid">
          {realHomeItems.map(({ icon: Icon, title }) => (
            <article className="landing-mini-card" key={title}>
              <Icon size={24} strokeWidth={1.9} />
              <h3>{title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-fade-up" aria-labelledby="landing-families">
        <div className="landing-section-heading">
          <span className="eyebrow">Hecho para el pais</span>
          <h2 id="landing-families">Construimos pensando en las familias salvadorenas</h2>
        </div>

        <div className="landing-highlight-grid">
          {familyValues.map(({ icon: Icon, title, description }) => (
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

      <section className="landing-flow landing-final-cta landing-fade-up" aria-labelledby="landing-cta">
        <div>
          <span className="eyebrow">Empieza hoy</span>
          <h2 id="landing-cta">Comienza a mejorar tu hogar hoy.</h2>
          <p>
            Sube una fotografia y descubre como la inteligencia artificial puede ayudarte a tomar
            mejores decisiones para tu vivienda.
          </p>
        </div>
        <Link to="/login" className="button button-primary">
          Comenzar analisis
          <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
