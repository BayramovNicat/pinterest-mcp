import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseConnection } from "../src/infrastructure/storage/database.ts";
import { ActionLogRepository } from "../src/infrastructure/storage/action-log.repository.ts";
import { CacheRepository } from "../src/infrastructure/storage/cache.repository.ts";
import { PinPublishingService } from "../src/application/services/pin-publishing.service.ts";
import { SeoOptimizerService } from "../src/application/services/seo-optimizer.service.ts";
import { BoardManagementService } from "../src/application/services/board-management.service.ts";
import { AccountService } from "../src/application/services/account.service.ts";
import type { IPinterestClient } from "../src/core/domain/interfaces/pinterest-client.interface.ts";
import type { PinterestAccount } from "../src/core/domain/entities/account.ts";
import type { PinterestBoard, PinterestBoardSection } from "../src/core/domain/entities/board.ts";
import type { PinterestPin, PaginatedResult } from "../src/core/domain/entities/pin.ts";
import type { RateLimitStatus } from "../src/core/domain/entities/analytics.ts";
import type { PinterestMediaSource } from "../src/core/domain/value-objects/media-source.ts";

// Mock Pinterest Client for clean unit testing
class MockPinterestClient implements IPinterestClient {
  public pins: PinterestPin[] = [];
  public boards: PinterestBoard[] = [];

  setAccessToken(_token: string): void {}

  getRateLimitStatus(): RateLimitStatus {
    return {
      limit: 1000,
      remaining: 990,
      resetSeconds: 60,
      resetDate: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getAccount(): Promise<PinterestAccount> {
    return {
      id: "acc_1",
      username: "pin_expert",
      accountType: "BUSINESS",
      pinCount: 15,
      followerCount: 250,
    };
  }

  async listBoards(): Promise<PaginatedResult<PinterestBoard>> {
    return { items: this.boards, bookmark: null };
  }

  async getBoard(boardId: string): Promise<PinterestBoard> {
    const board = this.boards.find((b) => b.id === boardId);
    if (!board) throw new Error("Board not found");
    return board;
  }

  async createBoard(params: { name: string; description?: string; privacy?: any }): Promise<PinterestBoard> {
    const board: PinterestBoard = {
      id: `board_${Date.now()}`,
      name: params.name,
      description: params.description,
      privacy: params.privacy || "PUBLIC",
      pinCount: 0,
    };
    this.boards.push(board);
    return board;
  }

  async updateBoard(boardId: string, params: any): Promise<PinterestBoard> {
    const board = await this.getBoard(boardId);
    const updated = { ...board, ...params };
    return updated;
  }

  async deleteBoard(boardId: string): Promise<{ success: boolean; boardId: string }> {
    this.boards = this.boards.filter((b) => b.id !== boardId);
    return { success: true, boardId };
  }

  async listBoardPins(_boardId: string): Promise<PaginatedResult<PinterestPin>> {
    return { items: this.pins, bookmark: null };
  }

  async listBoardSections(_boardId: string): Promise<PaginatedResult<PinterestBoardSection>> {
    return { items: [], bookmark: null };
  }

  async createBoardSection(_boardId: string, name: string): Promise<PinterestBoardSection> {
    return { id: "sec_1", name };
  }

  async deleteBoardSection(_boardId: string, _sectionId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  async listPins(): Promise<PaginatedResult<PinterestPin>> {
    return { items: this.pins, bookmark: null };
  }

  async getPin(pinId: string): Promise<PinterestPin> {
    const pin = this.pins.find((p) => p.id === pinId);
    if (!pin) throw new Error("Pin not found");
    return pin;
  }

  async createPin(params: any): Promise<PinterestPin> {
    const pin: PinterestPin = {
      id: `pin_${Date.now()}`,
      boardId: params.boardId,
      title: params.title,
      description: params.description,
      link: params.link,
    };
    this.pins.push(pin);
    return pin;
  }

  async updatePin(pinId: string, params: any): Promise<PinterestPin> {
    const pin = await this.getPin(pinId);
    return { ...pin, ...params };
  }

  async deletePin(pinId: string): Promise<{ success: boolean; pinId: string }> {
    this.pins = this.pins.filter((p) => p.id !== pinId);
    return { success: true, pinId };
  }

  async savePin(pinId: string, boardId: string): Promise<PinterestPin> {
    const original = await this.getPin(pinId);
    const savedPin: PinterestPin = { ...original, id: `saved_${Date.now()}`, boardId };
    this.pins.push(savedPin);
    return savedPin;
  }

  async getPinAnalytics(): Promise<Record<string, unknown>> {
    return { impressions: 1200, saves: 45 };
  }

  async getAccountAnalytics(): Promise<Record<string, unknown>> {
    return { total_impressions: 50000 };
  }

  async prepareMediaSourceFromPath(_filePath: string): Promise<PinterestMediaSource> {
    return {
      source_type: "image_base64",
      content_type: "image/png",
      data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };
  }
}

describe("Application - Services", () => {
  let db: DatabaseConnection;
  let actionLogRepo: ActionLogRepository;
  let cacheRepo: CacheRepository;
  let client: MockPinterestClient;

  beforeEach(() => {
    db = new DatabaseConnection({ dbPath: ":memory:" });
    actionLogRepo = new ActionLogRepository(db);
    cacheRepo = new CacheRepository(db);
    client = new MockPinterestClient();
  });

  afterEach(() => {
    db.close();
  });

  test("PinPublishingService publishes pin via URL and records action log", async () => {
    const service = new PinPublishingService(client, actionLogRepo, cacheRepo);

    const pin = await service.publishPin({
      boardId: "board_123",
      media: { kind: "imageUrl", url: "https://example.com/art.jpg" },
      title: "Artistic Poster",
      description: "Modern minimalist art",
      link: "https://example.com/product",
    });

    expect(pin.id).toBeDefined();
    expect(pin.title).toBe("Artistic Poster");

    const recentLogs = actionLogRepo.getRecentActions(5);
    expect(recentLogs.length).toBe(1);
    expect(recentLogs[0]?.action).toBe("create_pin");
    expect(recentLogs[0]?.target_id).toBe(pin.id);
  });

  test("SeoOptimizerService generates algorithmic Pinterest recommendations", () => {
    const seoService = new SeoOptimizerService();
    const result = seoService.optimizeMetadata({
      topic: "Minimalist Scandinavian Living Room",
      targetAudience: "Homeowners & Interior Designers",
      keywords: ["nordic decor", "hygge styling", "neutral color palette"],
      callToAction: "Explore the gallery today!",
    });

    expect(result.recommended_titles.length).toBe(3);
    for (const title of result.recommended_titles) {
      expect(title.length).toBeLessThanOrEqual(100);
    }

    expect(result.recommended_description).toContain("Minimalist Scandinavian Living Room");
    expect(result.recommended_description).toContain("nordic decor");
    expect(result.recommended_alt_text).toBeDefined();
    expect(result.recommended_hashtags.length).toBeGreaterThanOrEqual(3);
    expect(result.creative_best_practices.aspectRatio).toBe("2:3 (e.g. 1000 x 1500 pixels)");
  });

  test("BoardManagementService audits empty boards and large boards", async () => {
    client.boards = [
      { id: "b1", name: "Empty Ideas", privacy: "PUBLIC", pinCount: 0 },
      { id: "b2", name: "Huge Photography", privacy: "PUBLIC", pinCount: 85 },
      { id: "b3", name: "Secret Planning", privacy: "SECRET", pinCount: 12 },
    ];

    const boardService = new BoardManagementService(client, actionLogRepo);
    const audit = await boardService.auditBoards();

    expect(audit.totalBoards).toBe(3);
    expect(audit.publicBoards).toBe(2);
    expect(audit.secretBoards).toBe(1);
    expect(audit.emptyBoards.length).toBe(1);
    expect(audit.emptyBoards[0]).toContain("Empty Ideas");
    expect(audit.largeBoardsNeedingSections.length).toBe(1);
    expect(audit.largeBoardsNeedingSections[0]).toContain("Huge Photography");
    expect(audit.recommendations.length).toBeGreaterThan(0);
  });

  test("AccountService retrieves account and caches profile", async () => {
    const accountService = new AccountService(client, actionLogRepo, cacheRepo);
    const account = await accountService.getAccount();

    expect(account.username).toBe("pin_expert");
    const cached = cacheRepo.get<PinterestAccount>("account_info");
    expect(cached?.username).toBe("pin_expert");
  });
});
