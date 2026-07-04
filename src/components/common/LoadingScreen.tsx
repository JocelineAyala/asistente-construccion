import { ReactNode } from 'react';
import { Loader } from '../ui/Loader';

type LoadingScreenProps = {
  children?: ReactNode;
  label: string;
};

export function LoadingScreen({ children, label }: LoadingScreenProps) {
  return (
    <section className="loading-screen">
      <Loader label={label} />
      {children}
    </section>
  );
}
