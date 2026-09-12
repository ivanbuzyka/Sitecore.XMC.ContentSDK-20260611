import { kebabCase, capitalCase } from 'change-case';

import type { JSX } from 'react';

interface ComponentName {
  componentName: string;
  message?: string;
}

const NoDataFallback = (props: ComponentName): JSX.Element => {
  const { componentName, message } = props;
  const isRestricted = Boolean(message);

  return (
    <div className={`component w-full ${kebabCase(componentName)}`}>
      <div
        className={`component-content flex min-h-32 w-full items-center px-6 py-8 ${
          isRestricted
            ? 'border border-amber-400 bg-amber-50 text-amber-950'
            : 'border border-slate-300 bg-slate-50 text-slate-800'
        }`}
      >
        <span className="is-empty-hint block w-full max-w-full break-words text-lg leading-7">
          {message ||
            `${capitalCase(componentName)} requires a datasource item assigned. Please assign a datasource item to edit the content.`}
        </span>
      </div>
    </div>
  );
};

export { NoDataFallback };
