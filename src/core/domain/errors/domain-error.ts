/**
 * Base abstract class for all domain-specific errors.
 * @module core/domain/errors/domain-error
 */

export abstract class DomainError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: string;

  constructor(message: string, public readonly context?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = new.target.name;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
