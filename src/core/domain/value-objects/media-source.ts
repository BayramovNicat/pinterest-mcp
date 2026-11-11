/**
 * Value objects for media sources using Discriminated Unions.
 * @module core/domain/value-objects/media-source
 */

/** Supported raster image MIME types on Pinterest */
export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Incoming media payload specified as a public image URL.
 */
export interface ImageUrlPayload {
  readonly kind: "imageUrl";
  readonly url: string;
}

/**
 * Incoming media payload specified as a local filesystem path.
 */
export interface LocalFilePathPayload {
  readonly kind: "localFilePath";
  readonly path: string;
}

/**
 * Incoming media payload specified as raw base64 data.
 */
export interface Base64DataPayload {
  readonly kind: "base64Data";
  readonly data: string;
  readonly contentType: ImageMimeType;
}

/**
 * Discriminated union of all supported input media payloads.
 */
export type MediaPayload = ImageUrlPayload | LocalFilePathPayload | Base64DataPayload;

/**
 * Pinterest API v5 image URL media source format.
 */
export interface PinterestImageUrlMediaSource {
  readonly source_type: "image_url";
  readonly url: string;
}

/**
 * Pinterest API v5 base64 image media source format.
 */
export interface PinterestBase64MediaSource {
  readonly source_type: "image_base64";
  readonly content_type: ImageMimeType;
  readonly data: string;
}

/**
 * Pinterest API v5 multiple images (carousel) media source format.
 */
export interface PinterestMultipleImagesMediaSource {
  readonly source_type: "multiple_image_urls";
  readonly items: ReadonlyArray<{
    readonly url: string;
    readonly title?: string;
    readonly description?: string;
    readonly link?: string;
  }>;
}

/**
 * Pinterest API v5 video media source format.
 */
export interface PinterestVideoMediaSource {
  readonly source_type: "video_id";
  readonly media_id: string;
  readonly cover_image_url?: string;
  readonly cover_image_data?: string;
}

/**
 * Discriminated union of low-level Pinterest API v5 media sources.
 */
export type PinterestMediaSource =
  | PinterestImageUrlMediaSource
  | PinterestBase64MediaSource
  | PinterestMultipleImagesMediaSource
  | PinterestVideoMediaSource;
