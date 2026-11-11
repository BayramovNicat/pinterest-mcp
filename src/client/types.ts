export interface PinterestAccount {
  id: string;
  username: string;
  account_type?: "BUSINESS" | "INDIVIDUAL";
  profile_image?: string;
  website_url?: string;
  pin_count?: number;
  follower_count?: number;
  following_count?: number;
  monthly_views?: number;
  about?: string;
  business_name?: string;
}

export type BoardPrivacy = "PUBLIC" | "PROTECTED" | "SECRET";

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  privacy: BoardPrivacy;
  pin_count?: number;
  follower_count?: number;
  media?: {
    image_cover_url?: string;
    pin_thumbnail_urls?: string[];
  };
  owner?: {
    username: string;
  };
  created_at?: string;
}

export interface PinterestBoardSection {
  id: string;
  name: string;
}

export interface PinterestMediaSource {
  source_type: "image_url" | "image_base64" | "multiple_image_urls" | "video_id";
  content_type?: "image/jpeg" | "image/png" | "image/webp";
  data?: string;
  url?: string;
  items?: Array<{ url: string; title?: string; description?: string; link?: string }>;
}

export interface PinterestPin {
  id: string;
  created_at?: string;
  link?: string;
  title?: string;
  description?: string;
  dominant_color?: string;
  alt_text?: string;
  board_id: string;
  board_section_id?: string;
  board_owner?: {
    username: string;
  };
  media?: {
    media_type?: string;
    images?: {
      "150x150"?: { url: string; width: number; height: number };
      "400x300"?: { url: string; width: number; height: number };
      "600x"?: { url: string; width: number; height: number };
      "1200x"?: { url: string; width: number; height: number };
      originals?: { url: string; width: number; height: number };
    };
  };
  pin_metrics?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  bookmark?: string | null;
}

export interface RateLimitStatus {
  limit: number | null;
  remaining: number | null;
  resetSeconds: number | null;
  resetDate: string | null;
  lastUpdated: string;
}

export interface PinterestApiErrorResponse {
  code: number;
  message: string;
  details?: any;
}
