import { drawImageProp } from './common/helpers';
import { hslToCss } from './common/colour';
import Triangle from './Triangle';

export default class Canvas {
  constructor(element) {
    this.element = element;
    this.ctx = this.element.getctx('2d');
    this.points = [];
    this.triangles = [];

    this.geometry = 0;
    this.cellSize = 0;
    this.depth = 0;

    this.colours = [];

    this.gridWidth = 0;
    this.gridHeight = 0;

    this.columnCount = 0;
    this.rowCount = 0;

    this.image = null;
    this.useImage = false;
  }

  drawTriangle(vertices) {
    this.ctx.beginPath();
    this.ctx.moveTo(vertices[0].x, vertices[0].y);
    this.ctx.lineTo(vertices[1].x, vertices[1].y);
    this.ctx.lineTo(vertices[2].x, vertices[2].y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawBackground(callback) {
    const { ctx, element, colours } = this;

    ctx.clearRect(0, 0, element.width, element.height);

    // using an image
    if (this.image && this.useImage) {
      const baseImage = new Image();
      baseImage.crossOrigin = 'Anonymous';
      baseImage.src = this.image;

      baseImage.onload = () => {
        // use image instead of gradient
        // drawImageProp simulates background-size: cover
        drawImageProp(ctx, baseImage);
        callback();
      };
    } else {
      // using a gradient
      ctx.globalCompositeOperation = 'multiply';

      // loop colours and create gradient
      let gradient = ctx.createLinearGradient(0, 0, element.width, element.height);
      for (let i = 0; i < colours.length; i++) {
        if (colours.length > 1) {
          gradient.addColorStop(
            i / (colours.length - 1),
            hslToCss(...colours[i]),
          );
        } else {
          gradient = colours[i];
        }
      }

      // draw gradient on element
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.fillRect(0, 0, element.width, element.height);
      ctx.closePath();
      ctx.fill();

      // draw gradient overlay
      const overlay = ctx.createLinearGradient(0, 0, 0, element.height);
      overlay.addColorStop(0, '#fff');
      overlay.addColorStop(1, '#ccc');

      ctx.beginPath();
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, element.width, element.height);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // generate a grid of point objects
  generatePoints() {
    const {
      rowCount, columnCount, cellSize, variance,
    } = this;
    const ret = [];

    for (let i = 0; i < rowCount; i++) {
      for (let j = 0; j < columnCount; j++) {
        const temp = { x: 0, y: 0 };

        // even rows
        if (i % 2 === 0) {
          temp.x = (j * cellSize) - cellSize;
          temp.x += (Math.random() - 0.5) * variance * cellSize * 2;
        } else {
          // odd rows
          temp.x = (j * cellSize) - cellSize - (cellSize / 2);
          temp.x += (Math.random() - 0.5) * variance * cellSize * 2;
        }

        temp.y = (i * cellSize * 0.866) - cellSize;
        temp.y += (Math.random() - 0.5) * variance * cellSize * 2;

        ret.push(temp);
      }
    }

    this.points = ret;
  }

  generateTriangles() {
    const { points, rowCount, columnCount } = this;

    const ret = [];

    for (let i = 0; i < points.length; i++) {
      // don't add squares/triangles to the end of a row
      if ((i + 1) % columnCount !== 0 && i < (rowCount - 1 * columnCount)) {
        const square = [points[i], points[i + 1], points[rowCount + i], points[rowCount + i - 1]];

        // create two triangles from the square;
        const tri1 = new Triangle([square[0], square[1], square[3]]);
        const tri2 = new Triangle([square[1], square[2], square[3]]);

        ret.push(tri1);
        ret.push(tri2);
      }
    }

    this.triangles = ret;
  }

  drawCell(cell) {
    const { element, ctx, depth } = this;
    const centre = cell.getCentre();

    // boundaries
    if (centre.x < 0) centre.x = 0;
    if (centre.x > element.width - 1) centre.x = element.width - 1;
    if (centre.y < 0) centre.y = 0;
    if (centre.y > element.height - 1) centre.y = element.height - 1;

    const [red, green, blue, alpha] = ctx.getImageData(centre.x, centre.y, 1, 1).data;

    const temp = (Math.random() * 2 * depth) - depth;
    ctx.fillStyle = `rgba(
      ${Math.round(red - red * temp)},
      ${Math.round(green - green * temp)},
      ${Math.round(blue - blue * temp)},
      ${alpha / 255}
    )`;

    this.drawTriangle(cell);
  }

  render(options, callback) {
    Object.assign(this, options);

    this.gridWidth = this.element.width + this.cellSize * 2;
    this.gridHeight = this.element.height + this.cellSize * 2;

    this.columnCount = Math.ceil(this.gridWidth / this.cellSize) + 2;
    this.rowCount = Math.ceil(this.gridHeight / (this.cellSize * 0.865));

    const { element, ctx, triangles } = this;

    // clear canvases
    ctx.clearRect(0, 0, element.width, element.height);
    this.drawBackground();

    this.generatePoints();
    this.generateTriangles();

    // draw polygons on main canvas
    for (let i = 0; i < triangles.length; i++) {
      this.drawCell(i);
    }

    // generate data url of image
    this.dataUrl = element.toDataURL();

    if (callback) {
      callback();
    }
  }
}
