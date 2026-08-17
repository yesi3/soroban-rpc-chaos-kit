import { StaleLedgerError } from "../errors.js";

export type LedgerRegressionPolicy = "accept" | "warn" | "reject";
export interface LedgerGuardResult {
  accepted: boolean;
  regressed: boolean;
  observed: number;
  previous?: number;
  current: number;
  warning?: string;
}

/** Enforces monotonic ledger observations. */
export class MonotonicLedgerGuard {
  private current: number | undefined;
  constructor(private readonly policy: LedgerRegressionPolicy = "reject") {}

  /** Observe a ledger according to the configured regression policy. */
  observe(observed: number): LedgerGuardResult {
    if (!Number.isSafeInteger(observed) || observed < 0) throw new RangeError("Ledger must be a non-negative safe integer");
    const previous = this.current;
    if (previous === undefined || observed >= previous) {
      this.current = observed;
      return { accepted: true, regressed: false, observed, ...(previous === undefined ? {} : { previous }), current: observed };
    }
    if (this.policy === "reject") throw new StaleLedgerError(observed, previous);
    if (this.policy === "accept") this.current = observed;
    return {
      accepted: this.policy === "accept",
      regressed: true,
      observed,
      previous,
      current: this.current!,
      ...(this.policy === "warn" ? { warning: `Ignored regressing ledger ${observed}; current is ${previous}` } : {}),
    };
  }

  /** Reset the guard, optionally seeding a sequence. */
  reset(sequence?: number): void {
    if (sequence !== undefined && (!Number.isSafeInteger(sequence) || sequence < 0)) {
      throw new RangeError("Ledger must be a non-negative safe integer");
    }
    this.current = sequence;
  }
  /** Current accepted sequence. */
  value(): number | undefined { return this.current; }
}
