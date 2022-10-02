class Plugins<T extends (...args: any[]) => any, U> {
  handlers: T[];
  constructor() {
    this.handlers = [];
  }
  use(fn: T) {
    this.handlers.push(fn);
  }
  pipe(x: U): U | undefined {
    if (this.handlers.length === 0) {
      return x;
    }

    return this.handlers.reduce((v, f) => f.call(null, v), x);
  }
}

export default Plugins;
