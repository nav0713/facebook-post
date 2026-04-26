export type PostTone = "dramatic" | "intense" | "neutral";

export type OutputSize = "1080x1080" | "1080x1350" | "1920x1080";

export interface GeneratePostRequestFields {
  article: string;
  date: string;
  headline: string;
  personName: string;
  tone: PostTone;
  outputSize: OutputSize;
}

export interface GeneratedPostResult {
  generatedImage: string;
  caption: string;
  hashtags: string[];
  outputSize: OutputSize;
  isPlaceholder: boolean;
}

export interface GeneratePostSuccessResponse {
  success: true;
  data: GeneratedPostResult;
}

export interface GeneratePostErrorResponse {
  success: false;
  error: string;
}

export type GeneratePostResponse =
  | GeneratePostSuccessResponse
  | GeneratePostErrorResponse;
