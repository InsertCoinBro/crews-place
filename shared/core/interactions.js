export class Interactions {
  constructor() {
    this.items = [];
    this.current = null;
    this.handlers = new Map();
  }
  register(item) {
    const registered = { radius: 2.2, ...item };
    this.items.push(registered);
    return registered;
  }
  on(kind, handler) {
    this.handlers.set(kind, handler);
  }
  find(position, areaId) {
    this.current =
      this.items
        .filter(
          (i) => i.area === areaId && Math.abs(position.y - (i.y ?? 0)) < 2.2,
        )
        .map((i) => ({
          item: i,
          d: Math.hypot(position.x - i.x, position.z - i.z),
        }))
        .filter((v) => v.d < v.item.radius)
        .sort((a, b) => a.d - b.d)[0]?.item ?? null;
    return this.current;
  }
  activate() {
    if (this.current) this.handlers.get(this.current.kind)?.(this.current);
  }
}
