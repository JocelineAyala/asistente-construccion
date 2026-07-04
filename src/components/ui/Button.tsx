import {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from 'react';
import { cn } from '../../utils/cn';

type ButtonOwnProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  size?: 'md' | 'icon';
  variant?: 'primary' | 'secondary' | 'ghost';
};

export type ButtonProps<T extends ElementType = 'button'> = ButtonOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof ButtonOwnProps<T>>;

export function Button<T extends ElementType = 'button'>({
  as,
  children,
  className,
  fullWidth = false,
  size = 'md',
  variant = 'primary',
  ...props
}: ButtonProps<T>) {
  const Component = as ?? 'button';

  return (
    <Component
      className={cn(
        'button',
        `button-${variant}`,
        `button-${size}`,
        fullWidth && 'button-full',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
