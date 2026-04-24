export interface NewsSource {
  id: number;
  name: string;
  url: string;
  category: string;
  type: "local" | "international";
  active: boolean;
  created_at: string;
}

export interface NewsArticle {
  id: number;
  source_id: number;
  source_name: string;
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  published_at: string | null;
  category: string | null;
  created_at: string;
}

export interface NewsArticleFilters {
  category?: string;
  type?: "local" | "international";
  source_id?: number;
  page?: number;
  limit?: number;
}

export interface NewsArticlesResponse {
  articles: NewsArticle[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface RefreshResult {
  inserted: number;
  errors: number;
}
