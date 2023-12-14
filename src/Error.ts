class CustomError extends Error {
  name: string;
  constructor(error: string, name: string) {
    super(error);
    this.name = name;
  }
}

export { CustomError };
