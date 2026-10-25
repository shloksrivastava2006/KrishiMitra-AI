// Error carrying an HTTP status so the central handler can respond consistently.
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
