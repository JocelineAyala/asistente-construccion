type LoaderProps = {
  label?: string;
};

export function Loader({ label = 'Cargando' }: LoaderProps) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-spinner" />
      <span>{label}</span>
    </div>
  );
}
