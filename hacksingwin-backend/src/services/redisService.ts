import { redis } from '../config/redis';

const keys = {
  code: (teamId: string) => `workspace:${teamId}:code`,
  editor: (teamId: string) => `workspace:${teamId}:editor`,
  gen: (teamId: string) => `workspace:${teamId}:gen`,
  state: (teamId: string) => `workspace:${teamId}:state`,
  rateLimit: (teamId: string) => `ratelimit:submit:${teamId}`,
  turnDeadline: (teamId: string) => `workspace:${teamId}:turn_deadline`,
};

export const RedisService = {
  /**
   * Initializes workspace keys for a team with the initial editor, gen = 1, and turn deadline
   */
  async initWorkspace(teamId: string, editorId: string, initialCode = '', turnDurationSeconds = 300) {
    const deadline = Date.now() + turnDurationSeconds * 1000;
    await redis.mset(
      keys.code(teamId), initialCode,
      keys.editor(teamId), editorId,
      keys.gen(teamId), '1',
      keys.state(teamId), 'ACTIVE',
      keys.turnDeadline(teamId), deadline.toString()
    );
  },

  /**
   * Retrieves the current authoritative code buffer
   */
  async getCode(teamId: string): Promise<string> {
    return (await redis.get(keys.code(teamId))) ?? '';
  },

  /**
   * Updates the live code buffer in memory
   */
  async setCode(teamId: string, code: string): Promise<void> {
    await redis.set(keys.code(teamId), code);
  },

  /**
   * Retrieves current active editor userId
   */
  async getEditor(teamId: string): Promise<string | null> {
    return await redis.get(keys.editor(teamId));
  },

  /**
   * Swaps the active editor userId
   */
  async swapEditor(teamId: string, newEditorId: string): Promise<void> {
    await redis.set(keys.editor(teamId), newEditorId);
  },

  /**
   * Retrieves the current lock generation integer
   */
  async getGen(teamId: string): Promise<number> {
    const val = await redis.get(keys.gen(teamId));
    return val ? parseInt(val, 10) : 1;
  },

  /**
   * Atomically increments the lock generation integer
   */
  async incrementGen(teamId: string): Promise<number> {
    return await redis.incr(keys.gen(teamId));
  },

  /**
   * Retrieves current workspace state ("ACTIVE" | "LOCKED")
   */
  async getState(teamId: string): Promise<'ACTIVE' | 'LOCKED'> {
    const val = await redis.get(keys.state(teamId));
    return (val as 'ACTIVE' | 'LOCKED') ?? 'ACTIVE';
  },

  /**
   * Sets workspace state
   */
  async setState(teamId: string, state: 'ACTIVE' | 'LOCKED'): Promise<void> {
    await redis.set(keys.state(teamId), state);
  },

  /**
   * Sets the turn deadline epoch timestamp
   */
  async setTurnDeadline(teamId: string, durationSeconds = 300): Promise<number> {
    const deadline = Date.now() + durationSeconds * 1000;
    await redis.set(keys.turnDeadline(teamId), deadline.toString());
    return deadline;
  },

  /**
   * Retrieves the turn deadline epoch timestamp
   */
  async getTurnDeadline(teamId: string): Promise<number | null> {
    const val = await redis.get(keys.turnDeadline(teamId));
    return val ? parseInt(val, 10) : null;
  },

  /**
   * Clears turn deadline
   */
  async clearTurnDeadline(teamId: string): Promise<void> {
    await redis.del(keys.turnDeadline(teamId));
  },

  /**
   * Rate limiting: checks if submission cooldown is active
   */
  async isRateLimited(teamId: string): Promise<boolean> {
    const exists = await redis.get(keys.rateLimit(teamId));
    return Boolean(exists);
  },

  /**
   * Sets 5-second submission cooldown
   */
  async setRateLimit(teamId: string, ttlSeconds = 5): Promise<void> {
    await redis.set(keys.rateLimit(teamId), '1', 'EX', ttlSeconds);
  },
};
