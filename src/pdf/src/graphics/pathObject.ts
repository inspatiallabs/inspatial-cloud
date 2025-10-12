import { ObjectBase } from "../objects/objectBase.ts";
import type { Color, Position } from "./graphics.d.ts";
import { parseColor } from "./utils.ts";

export class PathObject extends ObjectBase {
  content: Array<string> = [];
  moveTo(x: number, y: number): typeof this {
    this.content.push(`${x} ${y} m\r\n`);
    return this;
  }
  lineTo(x: number, y: number): typeof this {
    this.content.push(`${x} ${y} l\r\n`);
    return this;
  }
  curveTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): typeof this {
    this.content.push(`${x1} ${y1} ${x2} ${y2} ${x3} ${y3} c\r\n`);
    return this;
  }
  closePath(): typeof this {
    this.content.push(`h\r\n`);
    return this;
  }
  stroke(): typeof this {
    this.content.push(`S\r\n`);
    return this;
  }
  setFillColor(color: Color): typeof this {
    const [r, g, b] = parseColor(color);
    this.content.push(`${r} ${g} ${b} rg\r\n`);
    return this;
  }
  setStrokeColor(color: Color): typeof this {
    const [r, g, b] = parseColor(color);
    this.content.push(`${r} ${g} ${b} RG\r\n`);
    return this;
  }
  fill(): typeof this {
    this.content.push(`f\r\n`);
    return this;
  }
  fillAndStroke(): typeof this {
    this.content.push(`B\r\n`);
    return this;
  }
  endPath(): typeof this {
    this.content.push(`n\r\n`);
    return this;
  }
  setLineWidth(width: number): typeof this {
    this.content.push(`${width} w\r\n`);
    return this;
  }
  setLineCap(style: 0 | 1 | 2): typeof this {
    this.content.push(`${style} J\r\n`);
    return this;
  }
  setLineJoin(style: 0 | 1 | 2): typeof this {
    this.content.push(`${style} j\r\n`);
    return this;
  }
  setMiterLimit(limit: number): typeof this {
    this.content.push(`${limit} M\r\n`);
    return this;
  }
  setDashPattern(pattern: number[], phase: number): typeof this {
    const patternStr = pattern.length > 0 ? pattern.join(" ") : "[]";
    this.content.push(`${patternStr} ${phase} d\r\n`);
    return this;
  }
  generate(): string {
    return this.content.join("");
  }
  $drawCircle(config: {
    center: Position;
    radius: number;
    border?: {
      width?: number;
      color?: Color;
    };
    fill?: {
      color?: Color;
    };
  }) {
    const { center, radius, border, fill } = config;
    const k = 0.552284749831; // Approximation for control point offset
    const ox = radius * k; // Control point offset horizontal
    const oy = radius * k; // Control point offset vertical
    let x: number;
    let y: number;
    switch (center.x) {
      case "start":
        x = radius;
        break;
      case "center":
        x = this.page?.pageSize.width / 2 || 0;
        break;
      case "end":
        x = (this.page?.pageSize.width || 0) - radius;
        break;
      default:
        x = center.x;
    }
    switch (center.y) {
      case "top":
        y = (this.page?.pageSize.height || 0) - radius;
        break;
      case "middle":
        y = (this.page?.pageSize.height || 0) / 2;
        break;
      case "bottom":
        y = radius;
        break;
      default:
        y = center.y;
    }

    if (fill?.color) {
      this.setFillColor(fill.color);
      this.moveTo(x + radius, y);
      this.curveTo(x + radius, y + oy, x + ox, y + radius, x, y + radius);
      this.curveTo(x - ox, y + radius, x - radius, y + oy, x - radius, y);
      this.curveTo(x - radius, y - oy, x - ox, y - radius, x, y - radius);
      this.curveTo(x + ox, y - radius, x + radius, y - oy, x + radius, y);
      this.closePath();
      this.fill();
    }
    if (border?.color && border?.width) {
      this.setStrokeColor(border.color);
      this.setLineWidth(border.width);
      this.moveTo(x + radius, y);
      this.curveTo(x + radius, y + oy, x + ox, y + radius, x, y + radius);
      this.curveTo(x - ox, y + radius, x - radius, y + oy, x - radius, y);
      this.curveTo(x - radius, y - oy, x - ox, y - radius, x, y - radius);
      this.curveTo(x + ox, y - radius, x + radius, y - oy, x + radius, y);
      this.closePath();
      this.stroke();
    }
    return this;
  }
  $drawBox(config: {
    size: {
      width: number;
      height: number;
    };
    position: { x: number; y: number };
    border?: {
      width?: number;
      color?: Color;
    };
    fill?: {
      color?: Color;
    };
  }) {
    const { size, position, border, fill } = config;
    if (fill?.color) {
      this.setFillColor(fill.color);
      this.moveTo(position.x, position.y);
      this.lineTo(position.x + size.width, position.y);
      this.lineTo(position.x + size.width, position.y + size.height);
      this.lineTo(position.x, position.y + size.height);
      this.closePath();
      this.fill();
    }
    if (border?.color && border?.width) {
      this.setStrokeColor(border.color);
      this.setLineWidth(border.width);
      this.moveTo(position.x, position.y);
      this.lineTo(position.x + size.width, position.y);
      this.lineTo(position.x + size.width, position.y + size.height);
      this.lineTo(position.x, position.y + size.height);
      this.closePath();
      this.stroke();
    }
    return this;
  }
}
