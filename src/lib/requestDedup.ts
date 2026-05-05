/**
 * Request deduplication: if the same request is already in-flight,
 * return the same promise instead of making another request.
 * Prevents duplicate API calls during rapid searches.
 */

type RequestKey = string;
type InFlightRequest<T> = Promise<T>;

const inFlightRequests = new Map<RequestKey, InFlightRequest<any>>();

/**
 * Execute a request with deduplication.
 * If the same key is already in-flight, return that promise.
 * If not, execute the fn and cache the promise.
 */
export async function deduplicatedRequest<T>(
  key: RequestKey,
  fn: () => Promise<T>,
): Promise<T> {
  // Check if this request is already in-flight
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // Create new request
  const promise = fn()
    .then((result) => {
      // Remove from in-flight once complete
      inFlightRequests.delete(key);
      return result;
    })
    .catch((error) => {
      // Remove on error too
      inFlightRequests.delete(key);
      throw error;
    });

  // Track this in-flight request
  inFlightRequests.set(key, promise);

  return promise;
}

/**
 * Clear all in-flight requests (for testing or reset)
 */
export function clearInFlightRequests(): void {
  inFlightRequests.clear();
}
