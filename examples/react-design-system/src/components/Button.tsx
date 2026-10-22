import type { JSX } from 'react';
import { Button as AriaButton, type ButtonProps as RACButtonProps } from 'react-aria-components';
import { button } from '@examples/design-system';

export type ButtonProps = Omit<RACButtonProps, 'className'> & {
  className?: string;
  intent?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ intent = 'secondary', className, ...props }: ButtonProps): JSX.Element {
  return <AriaButton {...props} className={`${button({ intent }).className} ${className || ''}`} />;
}
