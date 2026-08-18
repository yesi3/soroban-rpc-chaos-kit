import { scValToNative, xdr } from "@stellar/stellar-sdk";

/** Encode a Soroban ScVal symbol as base64 XDR. */
export function encodeTopicSymbol(symbol: string): string {
  const normalized = symbol.trim();
  if (normalized.length === 0) throw new RangeError("Soroban symbols cannot be empty");
  if (Buffer.byteLength(normalized, "utf8") > 32) throw new RangeError("Soroban symbols cannot exceed 32 bytes");
  return xdr.ScVal.scvSymbol(normalized).toXDR("base64");
}

/** Decode a base64 XDR ScVal symbol. Raw topic text is intentionally rejected. */
export function decodeTopicSymbol(encoded: string): string {
  if (!encoded.trim()) throw new TypeError("Topic must be base64-encoded ScVal XDR");
  try {
    const value = xdr.ScVal.fromXDR(encoded, "base64");
    if (value.switch() !== xdr.ScValType.scvSymbol()) throw new TypeError("Topic is not a symbol ScVal");
    return String(scValToNative(value));
  } catch (cause) {
    if (cause instanceof TypeError && cause.message === "Topic is not a symbol ScVal") throw cause;
    throw new TypeError("Topic must be base64-encoded ScVal XDR", { cause });
  }
}

export interface ContractEventFilter {
  type: "contract";
  contractIds: string[];
  topics?: string[][];
}

/** Build a getEvents contract filter with correctly encoded symbol topics. */
export function buildContractEventFilter(contractIds: readonly string[], symbols: readonly string[] = []): ContractEventFilter {
  if (contractIds.length === 0) throw new RangeError("At least one contract ID is required");
  if (contractIds.some((id) => !id.trim())) throw new RangeError("Contract IDs must not be blank");
  return {
    type: "contract",
    contractIds: [...contractIds],
    ...(symbols.length === 0 ? {} : { topics: [symbols.map(encodeTopicSymbol)] }),
  };
}
