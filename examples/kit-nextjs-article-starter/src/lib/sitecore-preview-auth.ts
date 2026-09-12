import { cookies, draftMode, headers } from 'next/headers';

const PREVIEW_TOKEN_COOKIE = 'sc_preview_token';

/**
 * Workaround for Content SDK v2.1.1+ Page Builder preview access control
 * (see "Workaround-description-for-Content SDK v2.1.1 and later" at the repo root).
 *
 * While a page is being edited/previewed, Sitecore issues a JWT that must be forwarded
 * manually as an `Authorization` header to `client.getPreview`/`client.getPage`/`client.getData`
 * calls, otherwise permission-restricted items (e.g. a component's datasource) are resolved
 * as if requested anonymously.
 * - On the very first render (triggered by /api/editing/render), the token is only available
 *   as the incoming `authorization` request header (see EDITING_PASS_THROUGH_HEADERS).
 * - On subsequent requests within the same preview session, it is available as the HttpOnly
 *   `sc_preview_token` cookie (set by PreviewProxy).
 * Call this from a Server Component, Route Handler or getComponentServerProps and pass the
 * result as fetchOptions to get permission-aware results while previewing.
 */
export async function getPreviewFetchOptions(): Promise<
  { headers: Record<string, string> } | undefined
> {
  const draft = await draftMode();
  if (!draft.isEnabled) {
    return undefined;
  }

  const headerList = await headers();
  const cookieStore = await cookies();
  const authToken =
    headerList.get('authorization') || cookieStore.get(PREVIEW_TOKEN_COOKIE)?.value;

  if (!authToken) {
    return undefined;
  }

  return { headers: { Authorization: authToken } };
}
