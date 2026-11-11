import type {
  PinterestAccount,
  PinterestBoard,
  PinterestBoardSection,
  PinterestPin,
  PinterestMediaSource,
  PaginatedResponse,
  RateLimitStatus,
  PinterestApiErrorResponse,
  BoardPrivacy,
} from "./types.ts";

export interface PinterestClientConfig {
  accessToken?: string;
  baseUrl?: string;
  useSandbox?: boolean;
}

export class PinterestApiError extends Error {
  public code: number;
  public status: number;
  public details?: any;

  constructor(message: string, status: number, code: number = 0, details?: any) {
    super(`Pinterest API Error (${status}${code ? ` / code ${code}` : ""}): ${message}`);
    this.name = "PinterestApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class PinterestClient {
  private accessToken: string;
  private baseUrl: string;
  private rateLimitInfo: RateLimitStatus = {
    limit: null,
    remaining: null,
    resetSeconds: null,
    resetDate: null,
    lastUpdated: new Date().toISOString(),
  };

  constructor(config: PinterestClientConfig = {}) {
    this.accessToken = config.accessToken || process.env.PINTEREST_ACCESS_TOKEN || "";
    const isSandbox = config.useSandbox ?? (process.env.PINTEREST_SANDBOX === "true");
    this.baseUrl = config.baseUrl || (isSandbox ? "https://api-sandbox.pinterest.com/v5" : "https://api.pinterest.com/v5");
  }

  public setAccessToken(token: string) {
    this.accessToken = token;
  }

  public getRateLimitStatus(): RateLimitStatus {
    return { ...this.rateLimitInfo };
  }

  private updateRateLimits(headers: Headers) {
    const limit = headers.get("x-ratelimit-limit");
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");

    if (remaining !== null) {
      const resetSec = reset ? parseInt(reset, 10) : null;
      this.rateLimitInfo = {
        limit: limit ? parseInt(limit, 10) : null,
        remaining: parseInt(remaining, 10),
        resetSeconds: resetSec,
        resetDate: resetSec ? new Date(Date.now() + resetSec * 1000).toISOString() : null,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new PinterestApiError(
        "Missing Pinterest Access Token. Please set PINTEREST_ACCESS_TOKEN in your environment or .env file.",
        401
      );
    }

    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${this.accessToken}`);
    if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    this.updateRateLimits(response.headers);

    if (response.status === 204) {
      return {} as T;
    }

    let data: any;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const errorData = data as PinterestApiErrorResponse;
      throw new PinterestApiError(
        errorData.message || response.statusText || "Unknown Pinterest API Error",
        response.status,
        errorData.code,
        errorData.details
      );
    }

    return data as T;
  }

  // --- Native Bun image processing ---
  public async prepareMediaSourceFromPath(filePath: string): Promise<PinterestMediaSource> {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) {
      throw new Error(`Local image file not found: ${filePath}`);
    }

    let contentType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg";
    const mime = file.type || "";
    if (mime.includes("png")) {
      contentType = "image/png";
    } else if (mime.includes("webp")) {
      contentType = "image/webp";
    } else if (mime.includes("jpeg") || mime.includes("jpg")) {
      contentType = "image/jpeg";
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    return {
      source_type: "image_base64",
      content_type: contentType,
      data: base64Data,
    };
  }

  // --- Account Endpoints ---
  public async getAccount(): Promise<PinterestAccount> {
    return this.request<PinterestAccount>("/user_account");
  }

  // --- Boards Endpoints ---
  public async listBoards(params?: {
    bookmark?: string;
    pageSize?: number;
    privacy?: BoardPrivacy;
  }): Promise<PaginatedResponse<PinterestBoard>> {
    const query = new URLSearchParams();
    if (params?.bookmark) query.set("bookmark", params.bookmark);
    if (params?.pageSize) query.set("page_size", Math.min(params.pageSize, 100).toString());
    if (params?.privacy) query.set("privacy", params.privacy);

    const queryString = query.toString();
    return this.request<PaginatedResponse<PinterestBoard>>(`/boards${queryString ? `?${queryString}` : ""}`);
  }

  public async getBoard(boardId: string): Promise<PinterestBoard> {
    return this.request<PinterestBoard>(`/boards/${encodeURIComponent(boardId)}`);
  }

  public async createBoard(params: {
    name: string;
    description?: string;
    privacy?: BoardPrivacy;
  }): Promise<PinterestBoard> {
    return this.request<PinterestBoard>("/boards", {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        description: params.description || "",
        privacy: params.privacy || "PUBLIC",
      }),
    });
  }

  public async updateBoard(
    boardId: string,
    params: {
      name?: string;
      description?: string;
      privacy?: BoardPrivacy;
    }
  ): Promise<PinterestBoard> {
    return this.request<PinterestBoard>(`/boards/${encodeURIComponent(boardId)}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    });
  }

  public async deleteBoard(boardId: string): Promise<{ success: boolean; boardId: string }> {
    await this.request<void>(`/boards/${encodeURIComponent(boardId)}`, {
      method: "DELETE",
    });
    return { success: true, boardId };
  }

  public async listBoardPins(
    boardId: string,
    params?: { bookmark?: string; pageSize?: number }
  ): Promise<PaginatedResponse<PinterestPin>> {
    const query = new URLSearchParams();
    if (params?.bookmark) query.set("bookmark", params.bookmark);
    if (params?.pageSize) query.set("page_size", Math.min(params.pageSize, 100).toString());

    const queryString = query.toString();
    return this.request<PaginatedResponse<PinterestPin>>(
      `/boards/${encodeURIComponent(boardId)}/pins${queryString ? `?${queryString}` : ""}`
    );
  }

  public async listBoardSections(
    boardId: string,
    params?: { bookmark?: string; pageSize?: number }
  ): Promise<PaginatedResponse<PinterestBoardSection>> {
    const query = new URLSearchParams();
    if (params?.bookmark) query.set("bookmark", params.bookmark);
    if (params?.pageSize) query.set("page_size", Math.min(params.pageSize, 100).toString());

    const queryString = query.toString();
    return this.request<PaginatedResponse<PinterestBoardSection>>(
      `/boards/${encodeURIComponent(boardId)}/sections${queryString ? `?${queryString}` : ""}`
    );
  }

  public async createBoardSection(boardId: string, name: string): Promise<PinterestBoardSection> {
    return this.request<PinterestBoardSection>(`/boards/${encodeURIComponent(boardId)}/sections`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  public async deleteBoardSection(boardId: string, sectionId: string): Promise<{ success: boolean }> {
    await this.request<void>(`/boards/${encodeURIComponent(boardId)}/sections/${encodeURIComponent(sectionId)}`, {
      method: "DELETE",
    });
    return { success: true };
  }

  // --- Pins Endpoints ---
  public async listPins(params?: {
    bookmark?: string;
    pageSize?: number;
    pinFilter?: string;
  }): Promise<PaginatedResponse<PinterestPin>> {
    const query = new URLSearchParams();
    if (params?.bookmark) query.set("bookmark", params.bookmark);
    if (params?.pageSize) query.set("page_size", Math.min(params.pageSize, 100).toString());
    if (params?.pinFilter) query.set("pin_filter", params.pinFilter);

    const queryString = query.toString();
    return this.request<PaginatedResponse<PinterestPin>>(`/pins${queryString ? `?${queryString}` : ""}`);
  }

  public async getPin(pinId: string): Promise<PinterestPin> {
    return this.request<PinterestPin>(`/pins/${encodeURIComponent(pinId)}`);
  }

  public async createPin(params: {
    boardId: string;
    mediaSource: PinterestMediaSource;
    title?: string;
    description?: string;
    link?: string;
    altText?: string;
    boardSectionId?: string;
    dominantColor?: string;
  }): Promise<PinterestPin> {
    const body: Record<string, any> = {
      board_id: params.boardId,
      media_source: params.mediaSource,
    };
    if (params.title) body.title = params.title.slice(0, 100);
    if (params.description) body.description = params.description.slice(0, 800);
    if (params.link) body.link = params.link;
    if (params.altText) body.alt_text = params.altText.slice(0, 500);
    if (params.boardSectionId) body.board_section_id = params.boardSectionId;
    if (params.dominantColor) body.dominant_color = params.dominantColor;

    return this.request<PinterestPin>("/pins", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  public async updatePin(
    pinId: string,
    params: {
      title?: string;
      description?: string;
      link?: string;
      altText?: string;
      boardId?: string;
      boardSectionId?: string;
    }
  ): Promise<PinterestPin> {
    const body: Record<string, any> = {};
    if (params.title !== undefined) body.title = params.title.slice(0, 100);
    if (params.description !== undefined) body.description = params.description.slice(0, 800);
    if (params.link !== undefined) body.link = params.link;
    if (params.altText !== undefined) body.alt_text = params.altText.slice(0, 500);
    if (params.boardId !== undefined) body.board_id = params.boardId;
    if (params.boardSectionId !== undefined) body.board_section_id = params.boardSectionId;

    return this.request<PinterestPin>(`/pins/${encodeURIComponent(pinId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  public async deletePin(pinId: string): Promise<{ success: boolean; pinId: string }> {
    await this.request<void>(`/pins/${encodeURIComponent(pinId)}`, {
      method: "DELETE",
    });
    return { success: true, pinId };
  }

  public async savePin(pinId: string, boardId: string, boardSectionId?: string): Promise<PinterestPin> {
    const body: Record<string, any> = {
      board_id: boardId,
    };
    if (boardSectionId) {
      body.board_section_id = boardSectionId;
    }

    return this.request<PinterestPin>(`/pins/${encodeURIComponent(pinId)}/save`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // --- Analytics Endpoints ---
  public async getPinAnalytics(
    pinId: string,
    params: {
      startDate: string;
      endDate: string;
      metricTypes: string[];
      appTypes?: "ALL" | "MOBILE" | "TABLET" | "WEB";
      splitField?: "NO_SPLIT" | "APP_TYPE";
    }
  ): Promise<Record<string, any>> {
    const query = new URLSearchParams({
      start_date: params.startDate,
      end_date: params.endDate,
      metric_types: params.metricTypes.join(","),
    });
    if (params.appTypes) query.set("app_types", params.appTypes);
    if (params.splitField) query.set("split_field", params.splitField);

    return this.request<Record<string, any>>(
      `/pins/${encodeURIComponent(pinId)}/analytics?${query.toString()}`
    );
  }

  public async getAccountAnalytics(params: {
    startDate: string;
    endDate: string;
    metricTypes: string[];
  }): Promise<Record<string, any>> {
    const query = new URLSearchParams({
      start_date: params.startDate,
      end_date: params.endDate,
      metric_types: params.metricTypes.join(","),
    });

    return this.request<Record<string, any>>(
      `/user_account/analytics?${query.toString()}`
    );
  }
}
