import { kebabCase, capitalCase } from 'change-case';

import type { JSX } from 'react';

interface ComponentName {
  componentName: string;
  message?: string;
}

const NoDataFallback = (props: ComponentName): JSX.Element => {
  const { componentName, message } = props;

  return (
    <div className={`component ${kebabCase(componentName)}`}>
      <div className="component-content">
        <span className="is-empty-hint">
          {message ||
            `${capitalCase(componentName)} requires a datasource item assigned. Please assign a datasource item to edit the content.`}
        </span>
      </div>
    </div>
  );
};

export { NoDataFallback };
