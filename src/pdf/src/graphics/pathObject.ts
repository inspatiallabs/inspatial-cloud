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
  curveTo(config: {
    controlPt1: {
      x: number;
      y: number;
    };
    controlPt2: {
      x: number;
      y: number;
    };
    endPoint: {
      x: number;
      y: number;
    };
  }): typeof this {
    const { controlPt1, controlPt2, endPoint } = config;
    this.content.push(
      `${controlPt1.x} ${controlPt1.y} ${controlPt2.x} ${controlPt2.y} ${endPoint.x} ${endPoint.y} c\r\n`,
    );
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
    const patternStr = pattern.length > 0 ? pattern.join(" ") : "";
    this.content.push(`[${patternStr}] ${phase} d\r\n`);
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
      dashed?: {
        pattern: number[];
        phase: number;
      };
    };
    fill?: {
      color?: Color;
    };
  }): typeof this {
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
    const drawCurves = () => {
      this.moveTo(x + radius, y);
      this.curveTo({
        controlPt1: { x: x + radius, y: y + oy },
        controlPt2: { x: x + ox, y: y + radius },
        endPoint: { x: x, y: y + radius },
      });
      this.curveTo({
        controlPt1: { x: x - ox, y: y + radius },
        controlPt2: { x: x - radius, y: y + oy },
        endPoint: { x: x - radius, y: y },
      });

      this.curveTo({
        controlPt1: { x: x - radius, y: y - oy },
        controlPt2: { x: x - ox, y: y - radius },
        endPoint: { x: x, y: y - radius },
      });
      this.curveTo({
        controlPt1: { x: x + ox, y: y - radius },
        controlPt2: { x: x + radius, y: y - oy },
        endPoint: { x: x + radius, y: y },
      });
    };
    if (fill?.color) {
      this.setFillColor(fill.color);
      drawCurves();
      this.closePath();
      this.fill();
    }

    if (border?.color && border?.width) {
      this.setStrokeColor(border.color);
      if (border?.dashed) {
        this.setDashPattern(border.dashed.pattern, border.dashed.phase);
      }
      this.setLineWidth(border.width);
      drawCurves();
      this.closePath();
    }

    this.stroke();
    if (border?.dashed) {
      this.setDashPattern([], 0);
    }
    return this;
  }
  $drawBox(config: {
    size: {
      width: number;
      height: number;
    };
    position: { x: number; y: number };
    radius?: number;
    border?: {
      width?: number;
      color?: Color;
      dashed?: {
        pattern: number[];
        phase: number;
      };
    };
    fill?: {
      color?: Color;
    };
  }): typeof this {
    const { size, position, border, fill, radius } = config;
    let offset = 0;
    if (radius) {
      offset = radius;
    }
    const xLeft = position.x;
    const xRight = position.x + size.width;
    const yBottom = position.y;
    const yTop = position.y + size.height;
    const drawLines = () => {
      this.moveTo(xLeft + offset, yBottom);
      this.lineTo(xRight - offset, yBottom);
      // this.lineTo(xRight, yBottom + offset);
      this.curveTo({
        controlPt1: { x: xRight, y: yBottom },
        controlPt2: { x: xRight, y: yBottom },
        endPoint: { x: xRight, y: yBottom + offset },
      });
      this.lineTo(xRight, yTop - offset);
      // this.lineTo(xRight - offset, yTop);
      this.curveTo({
        controlPt1: { x: xRight, y: yTop },
        controlPt2: { x: xRight, y: yTop },
        endPoint: { x: xRight - offset, y: yTop },
      });
      this.lineTo(xLeft + offset, yTop);
      // this.lineTo(xLeft, yTop - offset);
      this.curveTo({
        controlPt1: { x: xLeft, y: yTop },
        controlPt2: { x: xLeft, y: yTop },
        endPoint: { x: xLeft, y: yTop - offset },
      });
      this.lineTo(xLeft, yBottom + offset);
      // this.lineTo(xLeft + offset, yBottom);
      this.curveTo({
        controlPt1: { x: xLeft, y: yBottom },
        controlPt2: { x: xLeft, y: yBottom },
        endPoint: { x: xLeft + offset, y: yBottom },
      });
    };
    if (fill?.color) {
      this.setFillColor(fill.color);
      drawLines();
      this.closePath();
      this.fill();
    }
    if (border?.color && border?.width) {
      this.setStrokeColor(border.color);
      this.setLineWidth(border.width);

      drawLines();
      // this.closePath();
      if (border.dashed) {
        this.setDashPattern(border.dashed.pattern, border.dashed.phase);
      }
      this.stroke();
      this.setDashPattern([], 0);
    }
    return this;
  }
}
