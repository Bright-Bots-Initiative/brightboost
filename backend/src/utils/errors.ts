export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
    // Set the prototype explicitly to support `instanceof` checks
    Object.setPrototypeOf(this, GameError.prototype);
  }
}
