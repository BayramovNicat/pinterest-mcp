/**
 * Application service managing Pinterest Boards, Sections, and Account Board Auditing.
 * @module application/services/board-management.service
 */

import type { IPinterestClient } from "@interfaces/pinterest-client.interface.ts";
import type { IActionLogRepository } from "@interfaces/action-log-repository.interface.ts";
import type { PinterestBoard, PinterestBoardSection } from "@entities/board.ts";
import type { PinterestPin, PaginatedResult } from "@entities/pin.ts";
import type { BoardPrivacy } from "@value-objects/privacy.ts";

export interface BoardAuditReport {
  readonly totalBoards: number;
  readonly publicBoards: number;
  readonly secretBoards: number;
  readonly emptyBoards: readonly string[];
  readonly largeBoardsNeedingSections: readonly string[];
  readonly recommendations: readonly string[];
}

export class BoardManagementService {
  constructor(
    private readonly pinterestClient: IPinterestClient,
    private readonly actionLogRepo: IActionLogRepository
  ) {}

  public async listBoards(params?: {
    pageSize?: number;
    bookmark?: string;
    privacy?: BoardPrivacy;
  }): Promise<PaginatedResult<PinterestBoard>> {
    const result = await this.pinterestClient.listBoards(params);
    this.actionLogRepo.logAction({
      action: "list_boards",
      targetId: null,
      details: { count: result.items.length, bookmark: result.bookmark },
      status: "SUCCESS",
    });
    return result;
  }

  public async getBoard(boardId: string): Promise<PinterestBoard> {
    const board = await this.pinterestClient.getBoard(boardId);
    this.actionLogRepo.logAction({
      action: "get_board",
      targetId: boardId,
      details: { name: board.name },
      status: "SUCCESS",
    });
    return board;
  }

  public async createBoard(params: {
    name: string;
    description?: string;
    privacy?: BoardPrivacy;
  }): Promise<PinterestBoard> {
    const board = await this.pinterestClient.createBoard(params);
    this.actionLogRepo.logAction({
      action: "create_board",
      targetId: board.id,
      details: { name: params.name, privacy: params.privacy },
      status: "SUCCESS",
    });
    return board;
  }

  public async updateBoard(
    boardId: string,
    params: { name?: string; description?: string; privacy?: BoardPrivacy }
  ): Promise<PinterestBoard> {
    const board = await this.pinterestClient.updateBoard(boardId, params);
    this.actionLogRepo.logAction({
      action: "update_board",
      targetId: boardId,
      details: params,
      status: "SUCCESS",
    });
    return board;
  }

  public async deleteBoard(boardId: string): Promise<{ success: boolean; boardId: string }> {
    const result = await this.pinterestClient.deleteBoard(boardId);
    this.actionLogRepo.logAction({
      action: "delete_board",
      targetId: boardId,
      status: "SUCCESS",
    });
    return result;
  }

  public async listBoardPins(
    boardId: string,
    params?: { pageSize?: number; bookmark?: string }
  ): Promise<PaginatedResult<PinterestPin>> {
    const result = await this.pinterestClient.listBoardPins(boardId, params);
    this.actionLogRepo.logAction({
      action: "list_board_pins",
      targetId: boardId,
      details: { count: result.items.length },
      status: "SUCCESS",
    });
    return result;
  }

  public async listBoardSections(
    boardId: string,
    params?: { pageSize?: number; bookmark?: string }
  ): Promise<PaginatedResult<PinterestBoardSection>> {
    return this.pinterestClient.listBoardSections(boardId, params);
  }

  public async createBoardSection(boardId: string, name: string): Promise<PinterestBoardSection> {
    const section = await this.pinterestClient.createBoardSection(boardId, name);
    this.actionLogRepo.logAction({
      action: "create_board_section",
      targetId: boardId,
      details: { sectionId: section.id, name },
      status: "SUCCESS",
    });
    return section;
  }

  public async deleteBoardSection(boardId: string, sectionId: string): Promise<{ success: boolean }> {
    const result = await this.pinterestClient.deleteBoardSection(boardId, sectionId);
    this.actionLogRepo.logAction({
      action: "delete_board_section",
      targetId: sectionId,
      details: { boardId },
      status: "SUCCESS",
    });
    return result;
  }

  /**
   * Performs an automated architectural audit of the user's Pinterest boards.
   */
  public async auditBoards(): Promise<BoardAuditReport> {
    const boardsResponse = await this.pinterestClient.listBoards({ pageSize: 100 });
    const boards = boardsResponse.items;

    let publicCount = 0;
    let secretCount = 0;
    const emptyBoards: string[] = [];
    const largeBoardsNeedingSections: string[] = [];
    const recommendations: string[] = [];

    for (const b of boards) {
      if (b.privacy === "PUBLIC") publicCount++;
      if (b.privacy === "SECRET") secretCount++;

      const pinCount = b.pinCount ?? 0;
      if (pinCount === 0) {
        emptyBoards.push(`"${b.name}" (${b.id})`);
      } else if (pinCount >= 50) {
        largeBoardsNeedingSections.push(`"${b.name}" (${pinCount} pins)`);
      }
    }

    if (emptyBoards.length > 0) {
      recommendations.push(
        `Populate or archive ${emptyBoards.length} empty boards to improve profile authority.`
      );
    }
    if (largeBoardsNeedingSections.length > 0) {
      recommendations.push(
        `Organize ${largeBoardsNeedingSections.length} large boards into themed sections for better user navigation.`
      );
    }
    if (publicCount === 0 && boards.length > 0) {
      recommendations.push("You have no public boards visible to Pinterest search traffic.");
    }

    return {
      totalBoards: boards.length,
      publicBoards: publicCount,
      secretBoards: secretCount,
      emptyBoards,
      largeBoardsNeedingSections,
      recommendations,
    };
  }
}
