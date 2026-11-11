/**
 * Implementation of IPinterestClient using ResilientHttpClient and Bun native file handling.
 * @module infrastructure/pinterest/pinterest-client
 */

import type {
  IPinterestClient,
  ListBoardsParams,
  CreateBoardParams,
  UpdateBoardParams,
  ListBoardPinsParams,
  ListBoardSectionsParams,
  ListPinsParams,
  CreatePinParams,
  UpdatePinParams,
  PinAnalyticsParams,
  AccountAnalyticsParams,
} from "../../core/domain/interfaces/pinterest-client.interface.ts";
import type { PinterestAccount } from "../../core/domain/entities/account.ts";
import type { PinterestBoard, PinterestBoardSection } from "../../core/domain/entities/board.ts";
import type { PinterestPin, PaginatedResult } from "../../core/domain/entities/pin.ts";
import type { RateLimitStatus } from "../../core/domain/entities/analytics.ts";
import type { PinterestMediaSource } from "../../core/domain/value-objects/media-source.ts";
import { ResilientHttpClient } from "./http-client.ts";
import { PathSanitizer } from "../security/path-sanitizer.ts";
import { SecretMasker } from "../security/secret-masker.ts";
import type {
  PinterestApiAccountDto,
  PinterestApiBoardDto,
  PinterestApiBoardSectionDto,
  PinterestApiPinDto,
  PinterestApiPaginatedResponse,
} from "./types.ts";

export interface PinterestClientConfig {
  readonly accessToken?: string;
  readonly baseUrl?: string;
  readonly useSandbox?: boolean;
  readonly allowedDirectories?: readonly string[];
}

export class PinterestClient implements IPinterestClient {
  private accessToken: string;
  private readonly httpClient: ResilientHttpClient;
  private readonly pathSanitizer: PathSanitizer;

  constructor(config: PinterestClientConfig = {}) {
    this.accessToken = config.accessToken ?? process.env.PINTEREST_ACCESS_TOKEN ?? "";
    SecretMasker.registerSecret(this.accessToken);

    const isSandbox = config.useSandbox ?? (process.env.PINTEREST_SANDBOX === "true");
    const baseUrl = config.baseUrl ?? (isSandbox ? "https://api-sandbox.pinterest.com/v5" : "https://api.pinterest.com/v5");

    this.httpClient = new ResilientHttpClient({
      baseUrl,
      getAccessToken: () => this.accessToken,
    });

    this.pathSanitizer = new PathSanitizer({
      allowedDirectories: config.allowedDirectories,
    });
  }

  public setAccessToken(token: string): void {
    this.accessToken = token;
    SecretMasker.registerSecret(token);
  }

  public getRateLimitStatus(): RateLimitStatus {
    return this.httpClient.getRateLimitStatus();
  }

  /**
   * Prepares a Pinterest media source from a local file path.
   * Leverages Bun native Bun.file().bytes() for optimal memory consumption.
   * Validates path traversal against allowed root directories.
   * @param filePath - Local image path
   */
  public async prepareMediaSourceFromPath(filePath: string): Promise<PinterestMediaSource> {
    const sanitizedPath = await this.pathSanitizer.sanitizeImagePath(filePath);
    const file = Bun.file(sanitizedPath);
    const mime = this.pathSanitizer.inferImageMimeType(sanitizedPath, file.type);

    const bytes = await file.bytes();
    const base64Data = Buffer.from(bytes).toString("base64");

    return {
      source_type: "image_base64",
      content_type: mime,
      data: base64Data,
    };
  }

  // --- Account Endpoints ---
  public async getAccount(): Promise<PinterestAccount> {
    const raw = await this.httpClient.request<PinterestApiAccountDto>("/user_account");
    return {
      id: raw.id,
      username: raw.username,
      accountType: raw.account_type,
      profileImage: raw.profile_image,
      websiteUrl: raw.website_url,
      pinCount: raw.pin_count,
      followerCount: raw.follower_count,
      followingCount: raw.following_count,
      monthlyViews: raw.monthly_views,
      about: raw.about,
      businessName: raw.business_name,
    };
  }

  // --- Boards Endpoints ---
  public async listBoards(params?: ListBoardsParams): Promise<PaginatedResult<PinterestBoard>> {
    const query = new URLSearchParams();
    if (params?.bookmark) query.set("bookmark", params.bookmark);
    if (params?.pageSize) query.set("page_size", Math.min(params.pageSize, 100).toString());
    if (params?.privacy) query.set("privacy", params.privacy);

    const queryString = query.toString();
    const raw = await this.httpClient.request<PinterestApiPaginatedResponse<PinterestApiBoardDto>>(
      `/boards${queryString ? `?${queryString}` : ""}`
    );

    return {
      items: raw.items.map((b) => this.mapBoard(b)),
      bookmark: raw.bookmark,
    };
  }

  public async getBoard(boardId: string): Promise<PinterestBoard> {
    const raw = await this.httpClient.request<PinterestApiBoardDto>(`/boards/${encodeURIComponent(boardId)}`);
    return this.mapBoard(raw);
  }

  public async createBoard(params: CreateBoardParams): Promise<PinterestBoard> {
    const raw = await this.httpClient.request<PinterestApiBoardDto>("/boards", {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        description: params.description ?? "",
        privacy: params.privacy ?? "PUBLIC",
      }),
    });
    return this.mapBoard(raw);
  }

  public async updateBoard(boardId: string, params: UpdateBoardParams): Promise<PinterestBoard> {
    const body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.privacy !== undefined) body.privacy = params.privacy;

    const raw = await this.httpClient.request<PinterestApiBoardDto>(`/boards/${encodeURIComponent(boardId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return this.mapBoard(raw);
  }

  public async deleteBoard(boardId: string): Promise<{ readonly success: boolean; readonly boardId: string }> {
    await this.httpClient.request<void>(`/boards/${encodeURIComponent(boardId)}`, {
      method: "DELETE",
    });
    return { success: true, boardId };
  }

  // --- Board Sections ---
  public async listBoardPins(boardId: string, params?: ListBoardPinsParams): Promise<PaginatedResult<PinterestPin>> {
    const query = new URLSearchParams();
    if (params?.bookmark) query.set("bookmark", params.bookmark);
    if (params?.pageSize) query.set("page_size", Math.min(params.pageSize, 100).toString());

    const queryString = query.toString();
    const raw = await this.httpClient.request<PinterestApiPaginatedResponse<PinterestApiPinDto>>(
      `/boards/${encodeURIComponent(boardId)}/pins${queryString ? `?${queryString}` : ""}`
    );

    return {
      items: raw.items.map((p) => this.mapPin(p)),
      bookmark: raw.bookmark,
    };
  }

  public async listBoardSections(
    boardId: string,
    params?: ListBoardSectionsParams
  ): Promise<PaginatedResult<PinterestBoardSection>> {
    const query = new URLSearchParams();
    if (params?.bookmark) query.set("bookmark", params.bookmark);
    if (params?.pageSize) query.set("page_size", Math.min(params.pageSize, 100).toString());

    const queryString = query.toString();
    const raw = await this.httpClient.request<PinterestApiPaginatedResponse<PinterestApiBoardSectionDto>>(
      `/boards/${encodeURIComponent(boardId)}/sections${queryString ? `?${queryString}` : ""}`
    );

    return {
      items: raw.items.map((s) => ({ id: s.id, name: s.name })),
      bookmark: raw.bookmark,
    };
  }

  public async createBoardSection(boardId: string, name: string): Promise<PinterestBoardSection> {
    const raw = await this.httpClient.request<PinterestApiBoardSectionDto>(
      `/boards/${encodeURIComponent(boardId)}/sections`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      }
    );
    return { id: raw.id, name: raw.name };
  }

  public async deleteBoardSection(boardId: string, sectionId: string): Promise<{ readonly success: boolean }> {
    await this.httpClient.request<void>(
      `/boards/${encodeURIComponent(boardId)}/sections/${encodeURIComponent(sectionId)}`,
      {
        method: "DELETE",
      }
    );
    return { success: true };
  }

  // --- Pins Endpoints ---
  public async listPins(params?: ListPinsParams): Promise<PaginatedResult<PinterestPin>> {
    const query = new URLSearchParams();
    if (params?.bookmark) query.set("bookmark", params.bookmark);
    if (params?.pageSize) query.set("page_size", Math.min(params.pageSize, 100).toString());
    if (params?.pinFilter) query.set("pin_filter", params.pinFilter);

    const queryString = query.toString();
    const raw = await this.httpClient.request<PinterestApiPaginatedResponse<PinterestApiPinDto>>(
      `/pins${queryString ? `?${queryString}` : ""}`
    );

    return {
      items: raw.items.map((p) => this.mapPin(p)),
      bookmark: raw.bookmark,
    };
  }

  public async getPin(pinId: string): Promise<PinterestPin> {
    const raw = await this.httpClient.request<PinterestApiPinDto>(`/pins/${encodeURIComponent(pinId)}`);
    return this.mapPin(raw);
  }

  public async createPin(params: CreatePinParams): Promise<PinterestPin> {
    const body: Record<string, unknown> = {
      board_id: params.boardId,
      media_source: params.mediaSource,
    };
    if (params.title) body.title = params.title.slice(0, 100);
    if (params.description) body.description = params.description.slice(0, 800);
    if (params.link) body.link = params.link;
    if (params.altText) body.alt_text = params.altText.slice(0, 500);
    if (params.boardSectionId) body.board_section_id = params.boardSectionId;
    if (params.dominantColor) body.dominant_color = params.dominantColor;

    const raw = await this.httpClient.request<PinterestApiPinDto>("/pins", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return this.mapPin(raw);
  }

  public async updatePin(pinId: string, params: UpdatePinParams): Promise<PinterestPin> {
    const body: Record<string, unknown> = {};
    if (params.title !== undefined) body.title = params.title.slice(0, 100);
    if (params.description !== undefined) body.description = params.description.slice(0, 800);
    if (params.link !== undefined) body.link = params.link;
    if (params.altText !== undefined) body.alt_text = params.altText.slice(0, 500);
    if (params.boardId !== undefined) body.board_id = params.boardId;
    if (params.boardSectionId !== undefined) body.board_section_id = params.boardSectionId;

    const raw = await this.httpClient.request<PinterestApiPinDto>(`/pins/${encodeURIComponent(pinId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return this.mapPin(raw);
  }

  public async deletePin(pinId: string): Promise<{ readonly success: boolean; readonly pinId: string }> {
    await this.httpClient.request<void>(`/pins/${encodeURIComponent(pinId)}`, {
      method: "DELETE",
    });
    return { success: true, pinId };
  }

  public async savePin(pinId: string, boardId: string, boardSectionId?: string): Promise<PinterestPin> {
    const body: Record<string, unknown> = {
      board_id: boardId,
    };
    if (boardSectionId) {
      body.board_section_id = boardSectionId;
    }

    const raw = await this.httpClient.request<PinterestApiPinDto>(`/pins/${encodeURIComponent(pinId)}/save`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return this.mapPin(raw);
  }

  // --- Analytics Endpoints ---
  public async getPinAnalytics(pinId: string, params: PinAnalyticsParams): Promise<Record<string, unknown>> {
    const query = new URLSearchParams({
      start_date: params.startDate,
      end_date: params.endDate,
      metric_types: params.metricTypes.join(","),
    });
    if (params.appTypes) query.set("app_types", params.appTypes);
    if (params.splitField) query.set("split_field", params.splitField);

    return this.httpClient.request<Record<string, unknown>>(
      `/pins/${encodeURIComponent(pinId)}/analytics?${query.toString()}`
    );
  }

  public async getAccountAnalytics(params: AccountAnalyticsParams): Promise<Record<string, unknown>> {
    const query = new URLSearchParams({
      start_date: params.startDate,
      end_date: params.endDate,
      metric_types: params.metricTypes.join(","),
    });

    return this.httpClient.request<Record<string, unknown>>(`/user_account/analytics?${query.toString()}`);
  }

  // --- Private DTO Mappers ---
  private mapBoard(dto: PinterestApiBoardDto): PinterestBoard {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      privacy: dto.privacy,
      pinCount: dto.pin_count,
      followerCount: dto.follower_count,
      media: dto.media
        ? {
            imageCoverUrl: dto.media.image_cover_url,
            pinThumbnailUrls: dto.media.pin_thumbnail_urls,
          }
        : undefined,
      owner: dto.owner ? { username: dto.owner.username } : undefined,
      createdAt: dto.created_at,
    };
  }

  private mapPin(dto: PinterestApiPinDto): PinterestPin {
    return {
      id: dto.id,
      createdAt: dto.created_at,
      link: dto.link,
      title: dto.title,
      description: dto.description,
      dominantColor: dto.dominant_color,
      altText: dto.alt_text,
      boardId: dto.board_id,
      boardSectionId: dto.board_section_id,
      boardOwner: dto.board_owner ? { username: dto.board_owner.username } : undefined,
      media: dto.media
        ? {
            mediaType: dto.media.media_type,
            images: dto.media.images,
          }
        : undefined,
      pinMetrics: dto.pin_metrics,
    };
  }
}
