/**
 * Low-level Pinterest REST API v5 DTOs and contracts.
 * @module infrastructure/pinterest/types
 */

import type { BoardPrivacy } from "@value-objects/privacy.ts";
import type { PinterestMediaSource } from "@value-objects/media-source.ts";

export interface PinterestApiAccountDto {
  readonly id: string;
  readonly username: string;
  readonly account_type?: "BUSINESS" | "INDIVIDUAL";
  readonly profile_image?: string;
  readonly website_url?: string;
  readonly pin_count?: number;
  readonly follower_count?: number;
  readonly following_count?: number;
  readonly monthly_views?: number;
  readonly about?: string;
  readonly business_name?: string;
}

export interface PinterestApiBoardDto {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly privacy: BoardPrivacy;
  readonly pin_count?: number;
  readonly follower_count?: number;
  readonly media?: {
    readonly image_cover_url?: string;
    readonly pin_thumbnail_urls?: readonly string[];
  };
  readonly owner?: {
    readonly username: string;
  };
  readonly created_at?: string;
}

export interface PinterestApiBoardSectionDto {
  readonly id: string;
  readonly name: string;
}

export interface PinterestApiPinDto {
  readonly id: string;
  readonly created_at?: string;
  readonly link?: string;
  readonly title?: string;
  readonly description?: string;
  readonly dominant_color?: string;
  readonly alt_text?: string;
  readonly board_id: string;
  readonly board_section_id?: string;
  readonly board_owner?: {
    readonly username: string;
  };
  readonly media?: {
    readonly media_type?: string;
    readonly images?: {
      readonly "150x150"?: { readonly url: string; readonly width: number; readonly height: number };
      readonly "400x300"?: { readonly url: string; readonly width: number; readonly height: number };
      readonly "600x"?: { readonly url: string; readonly width: number; readonly height: number };
      readonly "1200x"?: { readonly url: string; readonly width: number; readonly height: number };
      readonly originals?: { readonly url: string; readonly width: number; readonly height: number };
    };
  };
  readonly pin_metrics?: Record<string, unknown>;
}

export interface PinterestApiPaginatedResponse<T> {
  readonly items: readonly T[];
  readonly bookmark?: string | null;
}

export interface PinterestApiErrorPayload {
  readonly code?: number;
  readonly message?: string;
  readonly details?: unknown;
}
