export interface ExtractionResult {
  originalTitle: string | null;
  taglishTitle: string | null;
  summary: string | null;
  keyPoints: string[];
  who: string[];
  what: string | null;
  when: string | null;
  where: string[];
  why: string | null;
  keywords: string[];
  author: string | null;
  publishedDate: string | null;
  source: string | null;
}

export interface ArticleMetadata {
  originalTitle: string | null;
  author: string | null;
  publishedDate: string | null;
  source: string | null;
  featuredImage: string | null;
  url: string;
}

export interface ExtractApiResponse {
  success: true;
  data: ExtractionResult;
  metadata: ArticleMetadata;
}

export interface ExtractApiError {
  success: false;
  error: string;
}

export type ExtractResponse = ExtractApiResponse | ExtractApiError;
