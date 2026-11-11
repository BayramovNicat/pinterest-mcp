/**
 * Domain entity representing an authenticated Pinterest user account.
 * @module core/domain/entities/account
 */

export interface PinterestAccount {
	readonly id: string;
	readonly username: string;
	readonly accountType?: "BUSINESS" | "INDIVIDUAL";
	readonly profileImage?: string;
	readonly websiteUrl?: string;
	readonly pinCount?: number;
	readonly followerCount?: number;
	readonly followingCount?: number;
	readonly monthlyViews?: number;
	readonly about?: string;
	readonly businessName?: string;
}
