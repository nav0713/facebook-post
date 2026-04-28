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
  hashtags: string[];
  author: string | null;
  publishedDate: string | null;
  source: string | null;
  facebookCaption: string | null;
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

export interface RefreshTitleApiResponse {
  success: true;
  taglishTitle: string;
}

export interface RefreshTitleApiError {
  success: false;
  error: string;
}

export type RefreshTitleResponse =
  | RefreshTitleApiResponse
  | RefreshTitleApiError;

export interface ImageCropBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export type ImageTextElementRole =
  | "date"
  | "headline"
  | "nameTag"
  | "caption"
  | "quote"
  | "other";

export interface ImageTextElement {
  text: string;
  role: ImageTextElementRole;
  box: ImageCropBox;
}

export interface ImageExtractionResult {
  cropBox: ImageCropBox | null;
  brandingBoxes: ImageCropBox[];
  textBoxes: ImageCropBox[];
  textElements: ImageTextElement[];
  extractedText: string | null;
  facebookCaption: string | null;
  hashtags: string[];
  description: string | null;
  recreationPrompt: string | null;
}

export interface ImageExtractApiResponse {
  success: true;
  data: ImageExtractionResult;
}

export interface ImageExtractApiError {
  success: false;
  error: string;
}

export type ImageExtractResponse =
  | ImageExtractApiResponse
  | ImageExtractApiError;

export interface ImageCaptionRevisionResult {
  facebookCaption: string;
  hashtags: string[];
}

export interface ImageCaptionRevisionApiResponse {
  success: true;
  data: ImageCaptionRevisionResult;
}

export interface ImageCaptionRevisionApiError {
  success: false;
  error: string;
}

export type ImageCaptionRevisionResponse =
  | ImageCaptionRevisionApiResponse
  | ImageCaptionRevisionApiError;
