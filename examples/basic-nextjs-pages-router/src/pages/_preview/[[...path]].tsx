import { useEffect, JSX } from 'react';
import { GetServerSideProps } from 'next';
import NotFound from 'src/NotFound';
import Layout from 'src/Layout';
import {
  SitecoreProvider,
  ComponentPropsContext,
  SitecorePageProps,
  getSiteRewriteData,
} from '@sitecore-content-sdk/nextjs';
import { extractPath, handleEditorFastRefresh } from '@sitecore-content-sdk/nextjs/utils';
import { isDesignLibraryPreviewData } from '@sitecore-content-sdk/nextjs/editing';
import client from 'lib/sitecore-client';
import components from '.sitecore/component-map';
import scConfig from 'sitecore.config';
import { getPreviewFetchOptions } from 'lib/sitecore-preview-auth';

/**
 * SSR counterpart of pages/[[...path]].tsx used only for Page Builder preview/editing.
 * SSR (as opposed to SSG/ISR) is required so the sc_preview_token cookie/JWT is available
 * and can be forwarded to Sitecore, allowing permission-restricted content to be resolved
 * correctly for the current author. See "Workaround-description-for-Content SDK v2.1.1 and later".
 */
const SitecorePage = ({ page, notFound, componentProps }: SitecorePageProps): JSX.Element => {
  useEffect(() => {
    handleEditorFastRefresh();
  }, []);

  if (notFound || !page) {
    return <NotFound />;
  }

  return (
    <ComponentPropsContext value={componentProps || {}}>
      <SitecoreProvider
        componentMap={components}
        api={scConfig.api}
        page={page}
        loadImportMap={() => import('.sitecore/import-map')}
      >
        <Layout page={page} />
      </SitecoreProvider>
    </ComponentPropsContext>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  let props = {};
  const path = extractPath(context);
  let page;

  const fetchOptions = getPreviewFetchOptions(context);

  if (context.preview && isDesignLibraryPreviewData(context.previewData)) {
    page = await client.getDesignLibraryData(context.previewData, fetchOptions);
  } else if (context.preview) {
    // The page is requested via /api/editing/render api route
    page = await client.getPreview(context.previewData, fetchOptions);
  } else {
    // The page is requested during navigation or requested directly via route path
    page = await client.getPage(
      path,
      { locale: context.locale },
      {
        headers: {
          ...fetchOptions?.headers,
          sc_previewMode: 'true',
          sc_site: getSiteRewriteData(path, '').siteName,
        },
      }
    );
  }

  if (page) {
    props = {
      page,
      dictionary: await client.getDictionary(
        {
          site: page.siteName,
          locale: page.locale,
        },
        fetchOptions
      ),
      componentProps: await client.getComponentData(page.layout, context, components),
    };
  }

  return {
    props,
    notFound: !page,
  };
};

export default SitecorePage;
