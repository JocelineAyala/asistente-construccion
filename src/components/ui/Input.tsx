import { InputHTMLAttributes, ReactNode, useId } from 'react';
import { cn } from '../../utils/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label?: string;
  leftIcon?: ReactNode;
};

export function Input({ className, error, id, label, leftIcon, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="input-field">
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <div className={cn('input-wrapper', error && 'input-invalid')}>
        {leftIcon ? <span className="input-icon">{leftIcon}</span> : null}
        <input
          id={inputId}
          className={className}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      </div>
      {error ? (
        <span className="input-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
