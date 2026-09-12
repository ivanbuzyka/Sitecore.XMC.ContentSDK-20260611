import scConfig from 'sitecore.config';
import client from '@/lib/sitecore-client';
import { getPreviewFetchOptions } from '@/lib/sitecore-preview-auth';

const SUMMARY_GRAPHQL_TYPE = 'AISummary';
const SUMMARY_DATA_PATH_SUFFIX = '/Data/AI Config/Summary';

export interface SummaryItem {
  title: string;
  description: string;
}

interface EdgeFieldValue {
  jsonValue?: { value?: string } | string;
}

interface SummaryQueryResult {
  item?: {
    title?: EdgeFieldValue;
    description?: EdgeFieldValue;
  };
}

function extractFieldValue(field?: EdgeFieldValue): string {
  if (!field || field.jsonValue == null) return '';
  const jv = field.jsonValue;
  if (typeof jv === 'string') return jv.trim();
  if (typeof jv === 'object' && 'value' in jv && typeof jv.value === 'string') {
    return jv.value.trim();
  }
  return '';
}

function buildSummaryQuery(fragmentType: string): string {
  return `
    query SummaryQuery($path: String!, $language: String!) {
      item(path: $path, language: $language) {
        ... on ${fragmentType} {
          title { jsonValue }
          description { jsonValue }
        }
      }
    }
  `;
}

function buildSummaryPath(): string {
  const siteName = scConfig.defaultSite || process.env.NEXT_PUBLIC_DEFAULT_SITE_NAME || '';
  if (!siteName) return '';
  return `/sitecore/content/solterra/${siteName}${SUMMARY_DATA_PATH_SUFFIX}`;
}

export async function fetchSummaryFromEdge(): Promise<SummaryItem | null> {
  const path = buildSummaryPath();
  if (!path) return null;

  const language = scConfig.defaultLanguage || 'en';

  try {
    // Forward the Page Builder preview JWT (if present) so permission-restricted items resolve correctly while previewing
    const fetchOptions = await getPreviewFetchOptions();
    const result = await client.getData<SummaryQueryResult>(
      buildSummaryQuery(SUMMARY_GRAPHQL_TYPE),
      { path, language },
      fetchOptions
    );

    if (!result?.item) return null;

    const title = extractFieldValue(result.item.title);
    const description = extractFieldValue(result.item.description);

    if (!title && !description) return null;

    return { title, description };
  } catch (error) {
    console.error('[fetchSummaryFromEdge] GraphQL request failed:', error);
    return null;
  }
}
