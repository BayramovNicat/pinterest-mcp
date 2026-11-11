/**
 * Security utility for sanitizing and guarding local filesystem path access.
 * Prevents Directory Traversal (CWE-22) attacks when reading image files for Pinterest pins.
 * @module infrastructure/security/path-sanitizer
 */

import { resolve, normalize, isAbsolute } from "node:path";
import { PathTraversalSecurityError } from "@errors/security-error.ts";
import { ValidationError } from "@errors/validation-error.ts";
import type { ImageMimeType } from "@value-objects/media-source.ts";

export interface PathSanitizerOptions {
  /**
   * List of allowed root directories. Defaults to [process.cwd()].
   */
  readonly allowedDirectories?: readonly string[];
  /**
   * Maximum allowed file size in bytes (defaults to 32MB for Pinterest images).
   */
  readonly maxFileSizeBytes?: number;
}

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export class PathSanitizer {
  private readonly allowedDirs: readonly string[];
  private readonly maxSizeBytes: number;

  constructor(options: PathSanitizerOptions = {}) {
    const cwd = process.cwd();
    const envDirs = process.env.ALLOWED_MEDIA_DIRS
      ? process.env.ALLOWED_MEDIA_DIRS.split(",").map((d) => resolve(d.trim()))
      : [];

    const dirs = options.allowedDirectories
      ? options.allowedDirectories.map((d) => resolve(d))
      : [cwd, ...envDirs];

    this.allowedDirs = dirs.map((d) => normalize(d));
    this.maxSizeBytes = options.maxFileSizeBytes ?? 32 * 1024 * 1024; // 32MB
  }

  /**
   * Validates and resolves a local file path, ensuring it does not escape allowed directories.
   * @param candidatePath - Path provided by client/tool
   * @returns Canonical resolved absolute path
   * @throws PathTraversalSecurityError if path escapes allowed boundaries
   * @throws ValidationError if file does not exist, has invalid extension, or exceeds size limit
   */
  public async sanitizeImagePath(candidatePath: string): Promise<string> {
    if (!candidatePath || typeof candidatePath !== "string") {
      throw new ValidationError("Local image file path must be a non-empty string");
    }

    // Check for null byte injection
    if (candidatePath.includes("\0")) {
      throw new PathTraversalSecurityError(candidatePath, "Null byte injection detected in path");
    }

    // Resolve absolute path against current working directory
    const resolvedPath = isAbsolute(candidatePath)
      ? normalize(candidatePath)
      : resolve(process.cwd(), candidatePath);

    // Verify the resolved path is within at least one allowed root directory
    const isWithinAllowed = this.allowedDirs.some((allowedDir) => {
      // Ensure directory prefix matches cleanly
      return resolvedPath === allowedDir || resolvedPath.startsWith(allowedDir + "/");
    });

    if (!isWithinAllowed) {
      throw new PathTraversalSecurityError(
        candidatePath,
        `Path "${candidatePath}" traverses outside allowed root directories: ${this.allowedDirs.join(", ")}`
      );
    }

    // Verify file extension
    const dotIndex = resolvedPath.lastIndexOf(".");
    const ext = dotIndex !== -1 ? resolvedPath.slice(dotIndex).toLowerCase() : "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new ValidationError(
        `Invalid file extension "${ext}". Allowed image extensions are: .jpg, .jpeg, .png, .webp`
      );
    }

    // Check file existence via Bun.file
    const bunFile = Bun.file(resolvedPath);
    const exists = await bunFile.exists();
    if (!exists) {
      throw new ValidationError(`Local image file not found: ${candidatePath}`);
    }

    // Check file size
    const size = bunFile.size;
    if (size > this.maxSizeBytes) {
      throw new ValidationError(
        `File size (${(size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of ${(this.maxSizeBytes / (1024 * 1024)).toFixed(0)} MB`
      );
    }

    return resolvedPath;
  }

  /**
   * Infers image MIME type from Bun.file or file extension.
   * @param filePath - Sanitized absolute file path
   * @param detectedMime - Optional MIME string from Bun.file.type
   */
  public inferImageMimeType(filePath: string, detectedMime?: string): ImageMimeType {
    if (detectedMime) {
      if (detectedMime.includes("png")) return "image/png";
      if (detectedMime.includes("webp")) return "image/webp";
      if (detectedMime.includes("jpeg") || detectedMime.includes("jpg")) return "image/jpeg";
    }

    const lower = filePath.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
  }
}
