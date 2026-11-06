import type React from 'react';
import { RichText as ContentSdkRichText } from '@sitecore-content-sdk/nextjs';
import { RichTextBlockProps } from './rich-text-block.props';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';

export const Default: React.FC<RichTextBlockProps> = (props) => {
  const { fields, params, page, rendering } = props;

  // A datasource is referenced but its fields didn't resolve, i.e. the author lacks access to it
  const hasDatasourceReference = Boolean(rendering?.dataSource);
  const hasDatasourceFields = Boolean(fields?.text);

  if (hasDatasourceFields) {
    const id = params?.RenderingIdentifier;
    return (
      <div
        className={cn('prose', { [props?.params?.styles]: props?.params?.styles })}
        id={id ? id : undefined}
        data-component-name="rich-text-block"
      >
        <ContentSdkRichText field={fields.text} />
      </div>
    );
  }

  return page?.mode?.isEditing ? (
    <NoDataFallback
      componentName="Rich Text Block"
      message={hasDatasourceReference ? 'This component contains restricted content.' : undefined}
    />
  ) : null;
};
