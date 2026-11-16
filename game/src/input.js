// Keyboard and mouse input with edge detection: the game asks whether a
// key went down this frame, not whether the browser repeated it.

const MOVE_KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

export class Input {
  constructor(canvas) {
    this.held = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };
    this._onKeyDown = (event) => {
      if (event.repeat) return;
      this.held.add(event.code);
      this.pressed.add(event.code);
      if (MOVE_KEYS[event.code] || event.code === 'Space') event.preventDefault();
    };
    this._onKeyUp = (event) => {
      this.held.delete(event.code);
    };
    this._onBlur = () => {
      this.held.clear();
    };
    this._onMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    };
    this._onMouseDown = (event) => {
      this._onMouseMove(event);
      this.mouse.clicked = true;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
  }

  axis() {
    let x = 0;
    let y = 0;
    if (this.held.has('ArrowLeft') || this.held.has('KeyA')) x -= 1;
    if (this.held.has('ArrowRight') || this.held.has('KeyD')) x += 1;
    if (this.held.has('ArrowUp') || this.held.has('KeyW')) y -= 1;
    if (this.held.has('ArrowDown') || this.held.has('KeyS')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  confirmPressed() {
    return this.wasPressed('Enter') || this.wasPressed('Space') || this.mouse.clicked;
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
