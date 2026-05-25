export class LoadDocumentError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class DocNotFoundError extends LoadDocumentError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class SaveDocumentError extends Error {}
