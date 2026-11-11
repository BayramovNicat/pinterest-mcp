/**
 * Port interface for the Pinterest REST API v5 client.
 * @module core/domain/interfaces/pinterest-client.interface
 */

import type { PinterestAccount } from "../entities/account.ts";
import type { PinterestBoard, PinterestBoardSection } from "../entities/board.ts";
import type { PinterestPin, PaginatedResult } from "../entities/pin.ts";
import type { RateLimitStatus } from "../entities/analytics.ts";
import type { BoardPrivacy } from "../value-objects/privacy.ts";
import type { PinterestMediaSource } from "../value-objects/media-source.ts";

export interface ListBoardsParams {
  readonly bookmark?: string;
  readonly pageSize?: number;
  readonly privacy?: BoardPrivacy;
}

export interface CreateBoardParams {
  readonly name: string;
  readonly description?: string;
  readonly privacy?: BoardPrivacy;
}

export interface UpdateBoardParams {
  readonly name?: string;
  readonly description?: string;
  readonly privacy?: BoardPrivacy;
}

export interface ListBoardPinsParams {
  readonly bookmark?: string;
  readonly pageSize?: number;
}

export interface ListBoardSectionsParams {
  readonly bookmark?: string;
  readonly pageSize?: number;
}

export interface ListPinsParams {
  readonly bookmark?: string;
  readonly pageSize?: number;
  readonly pinFilter?: string;
}

export interface CreatePinParams {
  readonly boardId: string;
  readonly mediaSource: PinterestMediaSource;
  readonly title?: string;
  readonly description?: string;
  readonly link?: string;
  readonly altText?: string;
  readonly boardSectionId?: string;
  readonly dominantColor?: string;
}

export interface UpdatePinParams {
  readonly title?: string;
  readonly description?: string;
  readonly link?: string;
  readonly altText?: string;
  readonly boardId?: string;
  readonly boardSectionId?: string;
}

export interface PinAnalyticsParams {
  readonly startDate: string;
  readonly endDate: string;
  readonly metricTypes: readonly string[];
  readonly appTypes?: "ALL" | "MOBILE" | "TABLET" | "WEB";
  readonly splitField?: "NO_SPLIT" | "APP_TYPE";
}

export interface AccountAnalyticsParams {
  readonly startDate: string;
  readonly endDate: string;
  readonly metricTypes: readonly string[];
}

/**
 * Interface defining all Pinterest REST API operations used in the domain.
 */
export interface IPinterestClient {
  setAccessToken(token: string): void;
  getRateLimitStatus(): RateLimitStatus;

  // Account
  getAccount(): Promise<PinterestAccount>;

  // Boards
  listBoards(params?: ListBoardsParams): Promise<PaginatedResult<PinterestBoard>>;
  getBoard(boardId: string): Promise<PinterestBoard>;
  createBoard(params: CreateBoardParams): Promise<PinterestBoard>;
  updateBoard(boardId: string, params: UpdateBoardParams): Promise<PinterestBoard>;
  deleteBoard(boardId: string): Promise<{ readonly success: boolean; readonly boardId: string }>;

  // Board Sections
  listBoardPins(boardId: string, params?: ListBoardPinsParams): Promise<PaginatedResult<PinterestPin>>;
  listBoardSections(boardId: string, params?: ListBoardSectionsParams): Promise<PaginatedResult<PinterestBoardSection>>;
  createBoardSection(boardId: string, name: string): Promise<PinterestBoardSection>;
  deleteBoardSection(boardId: string, sectionId: string): Promise<{ readonly success: boolean }>;

  // Pins
  listPins(params?: ListPinsParams): Promise<PaginatedResult<PinterestPin>>;
  getPin(pinId: string): Promise<PinterestPin>;
  createPin(params: CreatePinParams): Promise<PinterestPin>;
  updatePin(pinId: string, params: UpdatePinParams): Promise<PinterestPin>;
  deletePin(pinId: string): Promise<{ readonly success: boolean; readonly pinId: string }>;
  savePin(pinId: string, boardId: string, boardSectionId?: string): Promise<PinterestPin>;

  // Analytics
  getPinAnalytics(pinId: string, params: PinAnalyticsParams): Promise<Record<string, unknown>>;
  getAccountAnalytics(params: AccountAnalyticsParams): Promise<Record<string, unknown>>;

  // Media preparation
  prepareMediaSourceFromPath(filePath: string): Promise<PinterestMediaSource>;
}
