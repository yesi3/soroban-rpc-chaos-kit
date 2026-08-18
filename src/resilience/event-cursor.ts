import { RpcRetentionError, StaleLedgerError } from "../errors.js";
import type { RpcEvent } from "../types.js";

export interface EventCursorSnapshot {
  nextLedger: number;
  seenEventIds: string[];
}
export type RetentionPolicy = "clamp" | "reject";

/** Monotonic restart-safe cursor for getEvents polling. */
export class SafeEventCursor {
  private constructor(private nextLedger: number, private readonly seen = new Set<string>()) {}

  /** Seed a cursor from a latest-ledger provider. */
  static async seed(getLatestLedger: () => Promise<number>): Promise<SafeEventCursor> {
    const latest = await getLatestLedger();
    if (!Number.isSafeInteger(latest) || latest < 0) {
      throw new RangeError("Latest ledger must be a non-negative safe integer");
    }
    return new SafeEventCursor(latest + 1);
  }

  /** Restore a cursor snapshot. */
  static restore(snapshot: EventCursorSnapshot): SafeEventCursor {
    if (!Number.isSafeInteger(snapshot.nextLedger) || snapshot.nextLedger < 0) throw new RangeError("Invalid cursor ledger");
    return new SafeEventCursor(snapshot.nextLedger, new Set(snapshot.seenEventIds));
  }

  /** Resolve the next request ledger against server retention. */
  nextStartLedger(minimumLedger?: number, policy: RetentionPolicy = "clamp"): number {
    if (minimumLedger !== undefined && this.nextLedger < minimumLedger) {
      if (policy === "reject") throw new RpcRetentionError("Cursor is outside retention", minimumLedger);
      this.nextLedger = minimumLedger;
    }
    return this.nextLedger;
  }

  /** Observe events, returning only unseen IDs and advancing monotonically. */
  observe(events: readonly RpcEvent[], latestLedger?: number): RpcEvent[] {
    const unique: RpcEvent[] = [];
    let maximum = this.nextLedger - 1;
    for (const event of events) {
      if (!this.seen.has(event.id)) {
        this.seen.add(event.id);
        unique.push(event);
      }
      maximum = Math.max(maximum, event.ledger);
    }
    if (latestLedger !== undefined) {
      if (latestLedger < this.nextLedger - 1) throw new StaleLedgerError(latestLedger, this.nextLedger - 1);
      maximum = Math.max(maximum, latestLedger);
    }
    this.nextLedger = Math.max(this.nextLedger, maximum + 1);
    return unique;
  }

  /** Serialize cursor state. */
  snapshot(): EventCursorSnapshot {
    return { nextLedger: this.nextLedger, seenEventIds: [...this.seen] };
  }
}
