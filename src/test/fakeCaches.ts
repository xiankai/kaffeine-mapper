export class FakeCache {
  entries = new Map<string, Response>();

  private key(request: Request | string | URL): string {
    if (typeof request === "string") return request;
    return request instanceof URL ? request.href : request.url;
  }

  async match(request: Request | string | URL) {
    return this.entries.get(this.key(request))?.clone();
  }

  async put(request: Request | string | URL, response: Response) {
    this.entries.set(this.key(request), response);
  }

  async addAll(requests: (Request | string)[]) {
    const keys = requests.map((r) => this.key(r));
    if (new Set(keys).size !== keys.length)
      throw new DOMException("duplicate requests", "InvalidStateError");
    keys.forEach((key) => this.entries.set(key, new Response("")));
  }

  async keys() {
    return [...this.entries.keys()].map((url) => new Request(url));
  }

  async delete(request: Request | string | URL) {
    return this.entries.delete(this.key(request));
  }
}

export class FakeCaches {
  stores = new Map<string, FakeCache>();

  async open(name: string) {
    const existing = this.stores.get(name);
    if (existing) return existing as unknown as Cache;
    const cache = new FakeCache();
    this.stores.set(name, cache);
    return cache as unknown as Cache;
  }
}
