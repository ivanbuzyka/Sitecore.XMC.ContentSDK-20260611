import { type NextRequest, NextResponse } from 'next/server';
import {
  defineProxy,
  MultisiteProxy,
  PersonalizeProxy,
  PreviewProxy,
  RedirectsProxy,
  ProxyHandler,
} from '@sitecore-content-sdk/nextjs/proxy';
import sites from '.sitecore/sites.json';
import scConfig from 'sitecore.config';
import client from './lib/sitecore-client';

export default function proxy(req: NextRequest) {
  // If no Edge server contextId, skip Edge middlewares entirely.
  // (SSR/API can still use Local creds; no crash in Edge runtime.)
  if (!scConfig.api?.edge?.contextId) {
    return NextResponse.next();
  }

  // PreviewProxy authorizes preview requests (rejects direct Editing Host links to pages
  // the current user does not have permission to access).
  // See "Workaround-description-for-Content SDK v2.1.1 and later" at the repo root.
  const preview = new PreviewProxy({
    client,
    ...scConfig.api.edge,
  });

  // Instantiate AFTER the guard so constructors don’t run in local-only mode
  const multisite = new MultisiteProxy({
    /**
     * List of sites for site resolver to work with
     */
    sites,
    ...scConfig.api.edge,
    ...scConfig.multisite,
    // This function determines if the middleware should be turned off on per-request basis.
    // Certain paths are ignored by default (e.g. files and Next.js API routes), but you may wish to disable more.
    // This is an important performance consideration since Next.js Edge middleware runs on every request.
    skip: () => false,
  });

  const redirects = new RedirectsProxy({
    /**
     * List of sites for site resolver to work with
     */
    sites,
    ...scConfig.api.edge,
    ...scConfig.redirects,
    // This function determines if the middleware should be turned off on per-request basis.
    // Certain paths are ignored by default (e.g. Next.js API routes), but you may wish to disable more.
    // By default it is disabled while in development mode.
    // This is an important performance consideration since Next.js Edge middleware runs on every request.
    skip: () => false,
  });

  const personalize = new PersonalizeProxy({
    /**
     * List of sites for site resolver to work with
     */
    sites,
    ...scConfig.api.edge,
    ...scConfig.personalize,
    // This function determines if the middleware should be turned off on per-request basis.
    // Certain paths are ignored by default (e.g. Next.js API routes), but you may wish to disable more.
    // By default it is disabled while in development mode.
    // This is an important performance consideration since Next.js Edge middleware runs on every request.
    skip: () => false,
  });

  // Rewrites requests coming from the Page Builder preview environment (internal editing
  // host) so they render via _preview/[[...path]].tsx (SSR) instead of [[...path]].tsx
  // (SSG/ISR). SSR is required to be able to read the sc_preview_token cookie/JWT.
  const previewRewrite = new (class implements ProxyHandler {
    handle = async (req: NextRequest, res: NextResponse): Promise<NextResponse> => {
      // Skip if not an internal editing host
      if (!process.env.SITECORE) {
        return res;
      }

      // Skip if the request comes from the api route
      if (req.nextUrl.pathname.includes('/_preview')) {
        return res;
      }

      // x-sc-rewrite header is set by content-sdk proxies
      const currentRewritePath = res?.headers.get('x-sc-rewrite') || req.nextUrl.pathname;

      const rewritePath = `/_preview${currentRewritePath}`;

      const nextUrl = req.nextUrl.clone();
      nextUrl.pathname = rewritePath;

      return NextResponse.rewrite(nextUrl.href, res);
    };
  })();

  return defineProxy(preview, multisite, redirects, personalize, previewRewrite).exec(req);
}

export const config = {
  /*
   * Match all paths except for:
   * 1. /api routes
   * 2. /_next (Next.js internals)
   * 3. /sitecore/api (Sitecore API routes)
   * 4. /- (Sitecore media)
   * 5. /healthz (Health check)
   * 7. all root files inside /public
   */
  matcher: [
    '/',
    '/((?!api/|_next/|healthz|sitecore/api/|-/|favicon.ico|sc_logo.svg|sitemap|robots|llms).*)',
  ],
};
