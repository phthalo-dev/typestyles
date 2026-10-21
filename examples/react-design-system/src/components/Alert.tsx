import type { JSX, ReactNode } from 'react';
import { alert } from '@examples/design-system';
import { cx } from './utils';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'tip';
export type AlertAppearance = 'subtle' | 'solid';

export type AlertProps = {
  variant: AlertVariant;
  appearance?: AlertAppearance;
  title?: string;
  action?: { href: string; label: string };
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Alert({
  variant,
  appearance = 'subtle',
  title,
  action,
  icon,
  children,
  className,
}: AlertProps): JSX.Element {
  const a = alert({
    tone: variant,
    appearance,
    contentGap: title ? 'spaced' : 'flush',
  });

  return (
    <div
      className={cx(a.root.className, className)}
      data-alert
      data-alert-variant={variant}
      data-alert-appearance={appearance}
    >
      {icon ? (
        <div className={a.icon.className} data-alert-icon>
          {icon}
        </div>
      ) : null}
      <div className={a.body.className}>
        {title ? <p className={a.title.className}>{title}</p> : null}
        <div className={a.content.className} data-alert-content>
          {children}
        </div>
        {action ? (
          <div className={a.action.className}>
            <a className={a.actionLink.className} href={action.href} data-alert-action>
              {action.label}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
