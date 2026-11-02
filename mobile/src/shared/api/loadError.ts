import { ApiError, NetworkError } from "./errors";

export function loadErrorMessage(error: unknown): string {
  if (error instanceof NetworkError)
    return "We couldn’t connect. Check your internet connection and try again.";
  if (error instanceof ApiError) {
    if (error.status === 401)
      return "Your session could not be verified. Try again or sign in again.";
    if (error.status === 403)
      return "You don’t have access to this information.";
    if (error.status === 404)
      return "This information is no longer available. It may have been deleted.";
    if (error.status === 429)
      return "Too many requests. Please wait a minute before trying again.";
    if (error.status >= 500)
      return "The server is temporarily unavailable. Please try again shortly.";
  }
  return "We couldn’t load this information. Please try again.";
}
