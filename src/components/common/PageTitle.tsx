import { ReactNode } from 'react';

type PageTitleProps = {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
};

export function PageTitle({ children, eyebrow, title }: PageTitleProps) {
  return (
    <section className="page-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {children}
    </section>
  );
}
