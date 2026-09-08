// Constant speed along closed polylines, independent of frame rate.
export class Route {
  constructor(points) {
    this.points = points;
    this.segments = points.map((p, i) =>
      Math.hypot(
        points[(i + 1) % points.length][0] - p[0],
        points[(i + 1) % points.length][1] - p[1],
      ),
    );
    this.length = this.segments.reduce((a, b) => a + b, 0);
  }
  sample(distance) {
    let d = ((distance % this.length) + this.length) % this.length;
    for (let i = 0; i < this.points.length; i++) {
      if (d <= this.segments[i]) {
        const a = this.points[i],
          b = this.points[(i + 1) % this.points.length],
          t = d / this.segments[i];
        return {
          x: a[0] + (b[0] - a[0]) * t,
          z: a[1] + (b[1] - a[1]) * t,
          heading: Math.atan2(b[0] - a[0], b[1] - a[1]),
        };
      }
      d -= this.segments[i];
    }
  }
}
