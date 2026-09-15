import type { JSX } from 'react';

interface NoDataFallbackProps {
  componentName: string;
  // when provided, indicates a restricted/permission-denied datasource rather than a missing one
  message?: string;
}

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();

export const NoDataFallback = ({ componentName, message }: NoDataFallbackProps): JSX.Element => {
  const isRestricted = Boolean(message);

  return (
    <div className={`component w-full ${toKebabCase(componentName)}`}>
      <div
        className={`component-content flex min-h-32 w-full items-center px-6 py-8 ${
          isRestricted
            ? 'border border-amber-400 bg-amber-50 text-amber-950'
            : 'border border-slate-300 bg-slate-50 text-slate-800'
        }`}
      >
        <span className="is-empty-hint block w-full max-w-full break-words text-lg leading-7">
          {message ||
            `${componentName} requires a datasource item assigned. Please assign a datasource item to edit the content.`}
        </span>
      </div>
    </div>
  );
};
