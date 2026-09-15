import { GetServerSidePropsContext } from 'next';

/**
 * Workaround for Content SDK v2.1.1+ Page Builder preview access control
 * (see "Workaround-description-for-Content SDK v2.1.1 and later" at the repo root).
 *
 * While a page is being edited/previewed, Sitecore issues a JWT that must be forwarded
 * manually as an `Authorization` header to `client.getPreview`/`client.getPage`/`client.getData`
 * calls, otherwise permission-restricted items (e.g. a component's datasource) are resolved
 * as if requested anonymously.
 * - On the very first render (triggered by /api/editing/render), the token is only available
 *   as the incoming `authorization` request header.
 * - On subsequent requests within the same preview session, it is available as the HttpOnly
 *   `sc_preview_token` cookie (set by PreviewProxy).
 * Only available in getServerSideProps (SSR) - getStaticProps has no access to req/cookies.
 */
export function getPreviewFetchOptions(
  context: GetServerSidePropsContext
): { headers: Record<string, string> } | undefined {
  const authToken = context.req.headers.authorization || context.req.cookies['sc_preview_token'];

  if (!authToken) {
    return undefined;
  }

  return { headers: { Authorization: authToken } };
}
