// MOTHLIGHT — keyboard and mouse input.
// One clear job: turn keys and clicks into the game's movement and throw commands.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.moveX = 0;
    this.moveY = 0;
    this.sneak = false;
    this.throwAt = null; // {x, y} in tile space, set by a click, consumed by the game
    this.pressed = new Set(); // one-shot keys, consumed by the game each frame
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.recomputeMove();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.recomputeMove();
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.recomputeMove();
    });
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      this.throwAt = { x: px / 40, y: py / 40 };
    });
  }

  recomputeMove() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('w') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('s') || this.keys.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    this.moveX = len > 0 ? x / len : 0;
    this.moveY = len > 0 ? y / len : 0;
    this.sneak = this.keys.has('Shift');
  }

  // True once per physical key press; the game clears it after reading.
  wasPressed(key) {
    return this.pressed.has(key);
  }

  endFrame() {
    this.pressed.clear();
  }
}
