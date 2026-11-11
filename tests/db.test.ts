import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { LocalStore } from "../src/db/database.ts";

describe("LocalStore with bun:sqlite", () => {
  let store: LocalStore;

  beforeEach(() => {
    store = new LocalStore(":memory:");
  });

  afterEach(() => {
    store.close();
  });

  test("logs actions and retrieves recent actions", () => {
    store.logAction("create_pin", "pin_123", { title: "Test Pin" });
    store.logAction("create_board", "board_456", { name: "Test Board" });

    const recent = store.getRecentActions(10);
    expect(recent.length).toBe(2);
    expect(recent[0]?.action).toBe("create_board");
    expect(recent[0]?.target_id).toBe("board_456");
    expect(recent[1]?.action).toBe("create_pin");
    expect(recent[1]?.target_id).toBe("pin_123");
  });

  test("sets and gets cached items", () => {
    store.setCache("test_key", { user: "agent", score: 99 });
    const cached = store.getCache<{ user: string; score: number }>("test_key");
    expect(cached).toEqual({ user: "agent", score: 99 });
  });

  test("handles cache TTL expiration", async () => {
    store.setCache("expiring_key", { data: 123 });

    // Should be valid with 10s max age
    const valid = store.getCache("expiring_key", 10);
    expect(valid).not.toBeNull();

    // With 0 maxAgeSeconds (older than 0 sec), wait 5ms and check
    await new Promise((r) => setTimeout(r, 10));
    const expired = store.getCache("expiring_key", 0.001);
    expect(expired).toBeNull();
  });
});
