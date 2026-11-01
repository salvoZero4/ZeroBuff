export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // Per-field messages, filled for 422 validation errors.
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// No usable response: offline, DNS failure, timeout.
export class NetworkError extends Error {
  constructor(message = "Network unavailable or request timed out") {
    super(message);
    this.name = "NetworkError";
  }
}
