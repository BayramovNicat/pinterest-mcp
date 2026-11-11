/**
 * Domain entity representing a Pinterest board and board section.
 * @module core/domain/entities/board
 */

import type { BoardPrivacy } from "@value-objects/privacy.ts";

export interface PinterestBoardOwner {
	readonly username: string;
}

export interface PinterestBoardMedia {
	readonly imageCoverUrl?: string;
	readonly pinThumbnailUrls?: readonly string[];
}

export interface PinterestBoard {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly privacy: BoardPrivacy;
	readonly pinCount?: number;
	readonly followerCount?: number;
	readonly media?: PinterestBoardMedia;
	readonly owner?: PinterestBoardOwner;
	readonly createdAt?: string;
}

export interface PinterestBoardSection {
	readonly id: string;
	readonly name: string;
}
