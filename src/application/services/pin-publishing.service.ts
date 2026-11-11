/**
 * Application service orchestrating the Pin Publishing Pipeline.
 * @module application/services/pin-publishing.service
 */

import type { IPinterestClient } from "../../core/interfaces/pinterest-client.interface.ts";
import type { IActionLogRepository } from "../../core/interfaces/action-log-repository.interface.ts";
import type { ICacheRepository } from "../../core/interfaces/cache-repository.interface.ts";
import type { PinterestPin, PaginatedResult } from "../../core/domain/entities/pin.ts";
import type { PinterestMediaSource, MediaPayload } from "../../core/domain/value-objects/media-source.ts";
import { ValidationError } from "../../core/domain/errors/validation-error.ts";

export interface PublishPinCommand {
  readonly boardId: string;
  readonly media: MediaPayload;
  readonly title?: string;
  readonly description?: string;
  readonly link?: string;
  readonly altText?: string;
  readonly boardSectionId?: string;
  readonly dominantColor?: string;
}

export interface UpdatePinCommand {
  readonly pinId: string;
  readonly title?: string;
  readonly description?: string;
  readonly link?: string;
  readonly altText?: string;
  readonly boardId?: string;
  readonly boardSectionId?: string;
}

export class PinPublishingService {
  constructor(
    private readonly pinterestClient: IPinterestClient,
    private readonly actionLogRepo: IActionLogRepository,
    private readonly cacheRepo?: ICacheRepository
  ) {}

  /**
   * Resolves an incoming discriminated union MediaPayload into a low-level PinterestMediaSource.
   */
  public async resolveMediaSource(media: MediaPayload): Promise<PinterestMediaSource> {
    switch (media.kind) {
      case "localFilePath": {
        return this.pinterestClient.prepareMediaSourceFromPath(media.path);
      }
      case "imageUrl": {
        return {
          source_type: "image_url",
          url: media.url,
        };
      }
      case "base64Data": {
        return {
          source_type: "image_base64",
          content_type: media.contentType,
          data: media.data,
        };
      }
      default: {
        const exhaustiveCheck: never = media;
        throw new ValidationError(`Unsupported media kind: ${(exhaustiveCheck as { kind: string }).kind}`);
      }
    }
  }

  /**
   * Complete Pin Publishing Pipeline:
   * 1. Resolves media source (processing local image or URL)
   * 2. Calls Pinterest REST API to create pin
   * 3. Logs action in audit repository
   * 4. Updates cache
   */
  public async publishPin(command: PublishPinCommand): Promise<PinterestPin> {
    const mediaSource = await this.resolveMediaSource(command.media);

    try {
      const pin = await this.pinterestClient.createPin({
        boardId: command.boardId,
        mediaSource,
        title: command.title,
        description: command.description,
        link: command.link,
        altText: command.altText,
        boardSectionId: command.boardSectionId,
        dominantColor: command.dominantColor,
      });

      this.actionLogRepo.logAction({
        action: "create_pin",
        targetId: pin.id,
        details: {
          boardId: command.boardId,
          title: pin.title,
          link: command.link,
        },
        status: "SUCCESS",
      });

      this.cacheRepo?.set(`pin_${pin.id}`, pin);

      return pin;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.actionLogRepo.logAction({
        action: "create_pin",
        targetId: null,
        details: {
          boardId: command.boardId,
          title: command.title,
          error: message,
        },
        status: "ERROR",
      });
      throw error;
    }
  }

  public async getPin(pinId: string): Promise<PinterestPin> {
    try {
      const pin = await this.pinterestClient.getPin(pinId);
      this.actionLogRepo.logAction({
        action: "get_pin",
        targetId: pinId,
        details: { title: pin.title },
        status: "SUCCESS",
      });
      this.cacheRepo?.set(`pin_${pinId}`, pin);
      return pin;
    } catch (error: unknown) {
      this.actionLogRepo.logAction({
        action: "get_pin",
        targetId: pinId,
        details: { error: error instanceof Error ? error.message : String(error) },
        status: "ERROR",
      });
      throw error;
    }
  }

  public async listPins(params?: {
    pageSize?: number;
    bookmark?: string;
    pinFilter?: string;
  }): Promise<PaginatedResult<PinterestPin>> {
    try {
      const result = await this.pinterestClient.listPins(params);
      this.actionLogRepo.logAction({
        action: "list_pins",
        targetId: null,
        details: { count: result.items.length, bookmark: result.bookmark },
        status: "SUCCESS",
      });
      return result;
    } catch (error: unknown) {
      this.actionLogRepo.logAction({
        action: "list_pins",
        targetId: null,
        details: { error: error instanceof Error ? error.message : String(error) },
        status: "ERROR",
      });
      throw error;
    }
  }

  public async updatePin(command: UpdatePinCommand): Promise<PinterestPin> {
    try {
      const pin = await this.pinterestClient.updatePin(command.pinId, {
        title: command.title,
        description: command.description,
        link: command.link,
        altText: command.altText,
        boardId: command.boardId,
        boardSectionId: command.boardSectionId,
      });

      this.actionLogRepo.logAction({
        action: "update_pin",
        targetId: command.pinId,
        details: { title: command.title, boardId: command.boardId },
        status: "SUCCESS",
      });

      this.cacheRepo?.set(`pin_${pin.id}`, pin);
      return pin;
    } catch (error: unknown) {
      this.actionLogRepo.logAction({
        action: "update_pin",
        targetId: command.pinId,
        details: { error: error instanceof Error ? error.message : String(error) },
        status: "ERROR",
      });
      throw error;
    }
  }

  public async deletePin(pinId: string): Promise<{ success: boolean; pinId: string }> {
    try {
      const result = await this.pinterestClient.deletePin(pinId);
      this.actionLogRepo.logAction({
        action: "delete_pin",
        targetId: pinId,
        status: "SUCCESS",
      });
      this.cacheRepo?.delete(`pin_${pinId}`);
      return result;
    } catch (error: unknown) {
      this.actionLogRepo.logAction({
        action: "delete_pin",
        targetId: pinId,
        details: { error: error instanceof Error ? error.message : String(error) },
        status: "ERROR",
      });
      throw error;
    }
  }

  public async savePin(pinId: string, boardId: string, boardSectionId?: string): Promise<PinterestPin> {
    try {
      const pin = await this.pinterestClient.savePin(pinId, boardId, boardSectionId);
      this.actionLogRepo.logAction({
        action: "save_pin",
        targetId: pin.id,
        details: { originalPinId: pinId, boardId },
        status: "SUCCESS",
      });
      return pin;
    } catch (error: unknown) {
      this.actionLogRepo.logAction({
        action: "save_pin",
        targetId: pinId,
        details: { boardId, error: error instanceof Error ? error.message : String(error) },
        status: "ERROR",
      });
      throw error;
    }
  }
}
