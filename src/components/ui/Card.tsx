import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '../../utils/cn';

type CardOwnProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
};

export type CardProps<T extends ElementType = 'div'> = CardOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps<T>>;

export function Card<T extends ElementType = 'div'>({
  as,
  children,
  className,
  ...props
}: CardProps<T>) {
  const Component = as ?? 'div';

  return (
    <Component className={cn('card', className)} {...props}>
      {children}
    </Component>
  );
}
