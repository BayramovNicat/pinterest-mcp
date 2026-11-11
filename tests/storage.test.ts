import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseConnection } from "@storage/database.ts";
import { ActionLogRepository } from "@storage/action-log.repository.ts";
import { CacheRepository } from "@storage/cache.repository.ts";

describe("Storage - DatabaseConnection & Repositories", () => {
  let db: DatabaseConnection;
  let actionLogRepo: ActionLogRepository;
  let cacheRepo: CacheRepository;

  beforeEach(() => {
    db = new DatabaseConnection({ dbPath: ":memory:" });
    actionLogRepo = new ActionLogRepository(db);
    cacheRepo = new CacheRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  test("runs migrations and creates tracking table", () => {
    const migrations = db
      .rawDb
      .query("SELECT version, name FROM _schema_migrations ORDER BY version ASC")
      .all() as Array<{ version: number; name: string }>;

    expect(migrations.length).toBeGreaterThanOrEqual(2);
    expect(migrations[0]?.name).toBe("create_action_logs_table");
    expect(migrations[1]?.name).toBe("create_cache_table");
  });

  test("prepared statement cache reuses statements", () => {
    const sql = "SELECT 1 as num";
    const stmt1 = db.prepare(sql);
    const stmt2 = db.prepare(sql);
    expect(stmt1).toBe(stmt2);
  });

  test("ActionLogRepository records logs with secret masking", () => {
    actionLogRepo.logAction({
      action: "test_action",
      targetId: "target_123",
      details: { access_token: "secret_val_do_not_leak", title: "Valid Pin" },
      status: "SUCCESS",
    });

    const recent = actionLogRepo.getRecentActions(10);
    expect(recent.length).toBe(1);
    expect(recent[0]?.action).toBe("test_action");
    expect(recent[0]?.target_id).toBe("target_123");
    expect(recent[0]?.details).not.toContain("secret_val_do_not_leak");
    expect(recent[0]?.details).toContain("[REDACTED]");
  });

  test("ActionLogRepository queries by targetId", () => {
    actionLogRepo.logAction({ action: "act_1", targetId: "target_A" });
    actionLogRepo.logAction({ action: "act_2", targetId: "target_B" });
    actionLogRepo.logAction({ action: "act_3", targetId: "target_A" });

    const targetALogs = actionLogRepo.getActionsByTarget("target_A");
    expect(targetALogs.length).toBe(2);
    expect(targetALogs[0]?.target_id).toBe("target_A");
    expect(targetALogs[1]?.target_id).toBe("target_A");
  });

  test("CacheRepository stores and retrieves complex objects", () => {
    const complexData = {
      id: "board_999",
      sections: ["interior", "diy"],
      stats: { followers: 1500 },
    };

    cacheRepo.set("board_999", complexData);
    const retrieved = cacheRepo.get<typeof complexData>("board_999");
    expect(retrieved).toEqual(complexData);
  });

  test("CacheRepository supports TTL maxAge expiration and deletion", async () => {
    cacheRepo.set("short_lived", { count: 42 });

    // Valid when maxAge is 10s
    expect(cacheRepo.get("short_lived", 10)).not.toBeNull();

    // Expired when maxAge is 0.001s
    await new Promise((r) => setTimeout(r, 10));
    expect(cacheRepo.get("short_lived", 0.001)).toBeNull();

    // Delete
    cacheRepo.set("to_delete", "val");
    cacheRepo.delete("to_delete");
    expect(cacheRepo.get("to_delete")).toBeNull();
  });
});
