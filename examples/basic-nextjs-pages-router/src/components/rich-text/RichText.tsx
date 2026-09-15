import { JSX } from 'react';
import { Field, RichText as ContentSdkRichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';
import { NoDataFallback } from '../../utils/NoDataFallback';

interface Fields {
  Text: Field<string>;
}

export type RichTextProps = ComponentProps & {
  fields: Fields;
};

export const Default = ({ params, fields, rendering }: RichTextProps): JSX.Element | null => {
  const { RenderingIdentifier, styles } = params;
  const {
    page: { mode },
  } = useSitecore();

  // a datasource is referenced but its fields didn't resolve, i.e. the author lacks access to it
  const hasDatasourceReference = Boolean(rendering?.dataSource);
  const hasDatasourceFields = Boolean(fields?.Text);

  if (hasDatasourceFields) {
    return (
      <div className={`component rich-text ${styles}`} id={RenderingIdentifier}>
        <div className="component-content">
          <ContentSdkRichText field={fields.Text} />
        </div>
      </div>
    );
  }

  return mode.isEditing ? (
    <NoDataFallback
      componentName="Rich Text"
      message={
        hasDatasourceReference ? 'This component contains restricted content.' : undefined
      }
    />
  ) : null;
};
