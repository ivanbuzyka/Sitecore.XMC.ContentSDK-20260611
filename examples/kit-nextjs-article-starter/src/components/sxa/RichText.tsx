import React, { JSX } from 'react';
import { Field, RichText as ContentSdkRichText } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from '@/lib/component-props';
import { NoDataFallback } from '@/utils/NoDataFallback';

interface Fields {
  Text: Field<string>;
}

export type RichTextProps = Partial<Pick<ComponentProps, 'rendering' | 'page'>> & {
  params: { [key: string]: string };
  fields: Fields;
};

export const Default = (props: RichTextProps): JSX.Element | null => {
  const { fields, params, page, rendering } = props;

  // A datasource is referenced but its fields didn't resolve, i.e. the author lacks access to it
  const hasDatasourceReference = Boolean(rendering?.dataSource);
  const hasDatasourceFields = Boolean(fields?.Text);

  if (!hasDatasourceFields) {
    return page?.mode?.isEditing ? (
      <NoDataFallback
        componentName="Rich Text"
        message={
          hasDatasourceReference ? 'This component contains restricted content.' : undefined
        }
      />
    ) : null;
  }

  const id = params.RenderingIdentifier;

  return (
    <div
      className={`component rich-text ${params.styles.trimEnd()}`}
      id={id ? id : undefined}
    >
      <div className="component-content">
        <ContentSdkRichText field={fields.Text} />
      </div>
    </div>
  );
};
