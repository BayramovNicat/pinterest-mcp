/**
 * Zod validation schemas for MCP Board tools.
 * @module presentation/mcp/schemas/board.schemas
 */

import { z } from "zod";

export const ListBoardsInputSchema = {
  page_size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of boards to return (max 100, default 25)"),
  bookmark: z.string().optional().describe("Cursor for pagination"),
  privacy: z.enum(["PUBLIC", "PROTECTED", "SECRET"]).optional().describe("Filter boards by privacy setting"),
};

export const GetBoardInputSchema = {
  board_id: z.string().min(1).describe("The unique identifier of the board"),
};

export const CreateBoardInputSchema = {
  name: z.string().min(1).max(50).describe("Name of the board (up to 50 characters)"),
  description: z.string().max(500).optional().describe("Description of the board (up to 500 characters)"),
  privacy: z
    .enum(["PUBLIC", "PROTECTED", "SECRET"])
    .default("PUBLIC")
    .describe("Privacy level: PUBLIC, PROTECTED, or SECRET"),
};

export const UpdateBoardInputSchema = {
  board_id: z.string().min(1).describe("The ID of the board to update"),
  name: z.string().min(1).max(50).optional().describe("New name of the board"),
  description: z.string().max(500).optional().describe("New description of the board"),
  privacy: z.enum(["PUBLIC", "PROTECTED", "SECRET"]).optional().describe("New privacy level"),
};

export const DeleteBoardInputSchema = {
  board_id: z.string().min(1).describe("The ID of the board to delete"),
};

export const ListBoardPinsInputSchema = {
  board_id: z.string().min(1).describe("The board ID whose pins to retrieve"),
  page_size: z.number().int().min(1).max(100).optional().describe("Number of pins to return (max 100)"),
  bookmark: z.string().optional().describe("Pagination cursor"),
};

export const ListBoardSectionsInputSchema = {
  board_id: z.string().min(1).describe("The board ID to inspect sections for"),
  page_size: z.number().int().min(1).max(100).optional().describe("Number of sections to return"),
  bookmark: z.string().optional().describe("Pagination cursor"),
};

export const CreateBoardSectionInputSchema = {
  board_id: z.string().min(1).describe("The board ID in which to create the section"),
  name: z.string().min(1).max(180).describe("Section title/name"),
};

export const DeleteBoardSectionInputSchema = {
  board_id: z.string().min(1).describe("The board ID"),
  section_id: z.string().min(1).describe("The section ID to delete"),
};

export const AuditBoardsInputSchema = {};
