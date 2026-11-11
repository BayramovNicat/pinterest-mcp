import { describe, test, expect } from "bun:test";
import {
  createBoardId,
  createPinId,
  createBoardSectionId,
} from "../src/core/domain/value-objects/ids.ts";
import { createHexColor, isValidHexColor } from "../src/core/domain/value-objects/colors.ts";
import { isValidBoardPrivacy, BOARD_PRIVACY_LEVELS } from "../src/core/domain/value-objects/privacy.ts";
import { DomainError } from "../src/core/domain/errors/domain-error.ts";
import { PinterestApiError } from "../src/core/domain/errors/api-error.ts";
import { PinterestAuthenticationError } from "../src/core/domain/errors/authentication-error.ts";
import { RateLimitExceededError } from "../src/core/domain/errors/rate-limit-error.ts";
import { ResourceNotFoundError } from "../src/core/domain/errors/not-found-error.ts";
import { ValidationError } from "../src/core/domain/errors/validation-error.ts";
import { PathTraversalSecurityError } from "../src/core/domain/errors/security-error.ts";

describe("Core Domain - Value Objects", () => {
  test("creates branded IDs with validation", () => {
    const boardId = createBoardId("board_abc_123");
    expect(String(boardId)).toBe("board_abc_123");
    expect(() => createBoardId("  ")).toThrow("BoardId cannot be empty");

    const pinId = createPinId("pin_xyz_789");
    expect(String(pinId)).toBe("pin_xyz_789");
    expect(() => createPinId("")).toThrow("PinId cannot be empty");

    const sectionId = createBoardSectionId("sec_555");
    expect(String(sectionId)).toBe("sec_555");
    expect(() => createBoardSectionId("")).toThrow("BoardSectionId cannot be empty");
  });

  test("validates hex color codes", () => {
    const validColor = createHexColor("#AABBCC");
    expect(String(validColor)).toBe("#AABBCC");
    expect(isValidHexColor("#123456")).toBe(true);
    expect(isValidHexColor("invalid_color")).toBe(false);
    expect(isValidHexColor("#GGG")).toBe(false);
    expect(() => createHexColor("not_a_hex")).toThrow("Invalid hex color");
  });

  test("validates board privacy levels", () => {
    expect(isValidBoardPrivacy("PUBLIC")).toBe(true);
    expect(isValidBoardPrivacy("PROTECTED")).toBe(true);
    expect(isValidBoardPrivacy("SECRET")).toBe(true);
    expect(isValidBoardPrivacy("HIDDEN")).toBe(false);
    expect(BOARD_PRIVACY_LEVELS).toContain("PUBLIC");
  });
});

describe("Core Domain - Errors", () => {
  test("PinterestAuthenticationError conforms to domain error hierarchy", () => {
    const err = new PinterestAuthenticationError("Invalid credentials");
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(PinterestApiError);
    expect(err.code).toBe("PINTEREST_AUTHENTICATION_ERROR");
    expect(err.status).toBe(401);
  });

  test("RateLimitExceededError contains retry-after information", () => {
    const err = new RateLimitExceededError("Too many calls", 45);
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(PinterestApiError);
    expect(err.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(err.status).toBe(429);
    expect(err.retryAfterSeconds).toBe(45);
  });

  test("ResourceNotFoundError stores resource identity", () => {
    const err = new ResourceNotFoundError("Board", "b_123");
    expect(err).toBeInstanceOf(DomainError);
    expect(err.resourceType).toBe("Board");
    expect(err.resourceId).toBe("b_123");
    expect(err.code).toBe("RESOURCE_NOT_FOUND");
  });

  test("ValidationError stores validation issues", () => {
    const issues = [{ path: "title", message: "Title too long" }];
    const err = new ValidationError("Schema failed", issues);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.validationErrors).toEqual(issues);
  });

  test("PathTraversalSecurityError stores attempted path", () => {
    const err = new PathTraversalSecurityError("../../../etc/passwd");
    expect(err).toBeInstanceOf(DomainError);
    expect(err.code).toBe("PATH_TRAVERSAL_DETECTED");
    expect(err.attemptedPath).toBe("../../../etc/passwd");
  });
});
