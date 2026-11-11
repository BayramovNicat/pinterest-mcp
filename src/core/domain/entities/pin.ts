/**
 * Domain entity representing a Pinterest Pin.
 * @module core/domain/entities/pin
 */

export interface PinImageSpec {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface PinImages {
  readonly "150x150"?: PinImageSpec;
  readonly "400x300"?: PinImageSpec;
  readonly "600x"?: PinImageSpec;
  readonly "1200x"?: PinImageSpec;
  readonly originals?: PinImageSpec;
}

export interface PinMediaDetails {
  readonly mediaType?: string;
  readonly images?: PinImages;
}

export interface PinterestPin {
  readonly id: string;
  readonly createdAt?: string;
  readonly link?: string;
  readonly title?: string;
  readonly description?: string;
  readonly dominantColor?: string;
  readonly altText?: string;
  readonly boardId: string;
  readonly boardSectionId?: string;
  readonly boardOwner?: {
    readonly username: string;
  };
  readonly media?: PinMediaDetails;
  readonly pinMetrics?: Readonly<Record<string, unknown>>;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly bookmark?: string | null;
}
