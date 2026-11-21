// MOTHLIGHT — the game itself: loop, state machine, player, pebbles, levels.
// One clear job: run the game the other modules describe.

import { TILE, VIEW_W, VIEW_H, PLAYER_SPEED, PLAYER_SNEAK_SPEED, PEBBLES_PER_LEVEL, PEBBLE_RANGE, PEBBLE_HEAR_RADIUS } from './config.js';
import { LEVELS, parseLevel, isSolid, isShadow } from './levels.js';
import { Guard, GUARD_STATES, highestDetection } from './guards.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';

const SCREENS = {
  TITLE: 'title',
  PLAYING: 'playing',
  LEVEL_CLEAR: 'levelclear',
  CAUGHT: 'caught',
  VICTORY: 'victory',
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

class Mothlight {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.sounds = new SoundBank();
    this.screen = SCREENS.TITLE;
    this.levelIndex = 0;
    this.totalTime = 0;
    this.timesSeen = 0;
    this.pebblesUsed = 0;
    this.ghost = true; // never been fully spotted, all three levels
    this.levelTime = 0;
    this.clearTimer = 0;
    this.caughtTimer = 0;
    this.stepTimer = 0;
    this.loadLevel(0);
    this.last = performance.now();
    // Exposed for debugging and automated play-tests; the game never reads it.
    window.__mothlight = this;
    requestAnimationFrame((t) => this.frame(t));
  }

  loadLevel(index) {
    const def = LEVELS[index];
    const parsed = parseLevel(def);
    this.grid = parsed.grid;
    this.player = { x: parsed.player.x, y: parsed.player.y, moving: false, sneaking: false };
    this.guards = def.guards.map((g) => new Guard(g));
    this.moths = parsed.moths;
    this.exit = parsed.exit;
    this.exitOpen = false;
    this.pebbles = PEBBLES_PER_LEVEL;
    this.pebbleMarks = [];
    this.levelTime = 0;
    this.levelName = def.name;
    this.intro = def.intro;
  }

  mothsTaken() {
    return this.moths.filter((m) => m.taken).length;
  }

  startGame() {
    this.sounds.ensure();
    this.levelIndex = 0;
    this.totalTime = 0;
    this.timesSeen = 0;
    this.pebblesUsed = 0;
    this.ghost = true;
    this.loadLevel(0);
    this.screen = SCREENS.PLAYING;
  }

  restartLevel() {
    this.loadLevel(this.levelIndex);
    this.screen = SCREENS.PLAYING;
  }

  nextLevel() {
    this.levelIndex += 1;
    if (this.levelIndex >= LEVELS.length) {
      this.screen = SCREENS.VICTORY;
      this.sounds.victory();
      return;
    }
    this.loadLevel(this.levelIndex);
    this.screen = SCREENS.PLAYING;
  }

  throwPebble() {
    const target = this.input.throwAt;
    this.input.throwAt = null;
    if (!target || this.pebbles <= 0) return;
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    if (Math.hypot(dx, dy) > PEBBLE_RANGE) return;
    const tx = Math.floor(target.x);
    const ty = Math.floor(target.y);
    if (isSolid(this.grid, tx, ty)) return;
    this.pebbles -= 1;
    this.pebblesUsed += 1;
    this.pebbleMarks.push({ x: tx + 0.5, y: ty + 0.5, ring: 0 });
    this.sounds.pebble();
    for (const guard of this.guards) {
      const dist = Math.hypot(guard.x - (tx + 0.5), guard.y - (ty + 0.5));
      if (dist <= PEBBLE_HEAR_RADIUS) guard.hearNoise(tx + 0.5, ty + 0.5);
    }
  }

  movePlayer(dt) {
    const speed = this.input.sneak ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
    const mx = this.input.moveX;
    const my = this.input.moveY;
    this.player.sneaking = this.input.sneak;
    this.player.moving = mx !== 0 || my !== 0;
    if (!this.player.moving) return;
    const step = speed * dt;
    const nx = this.player.x + mx * step;
    const ny = this.player.y + my * step;
    // Axis-separated sliding, same as the guards, so walls never trap the player.
    if (!isSolid(this.grid, Math.floor(nx), Math.floor(this.player.y))) this.player.x = nx;
    if (!isSolid(this.grid, Math.floor(this.player.x), Math.floor(ny))) this.player.y = ny;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.sounds.step(this.player.sneaking);
      this.stepTimer = this.player.sneaking ? 0.5 : 0.34;
    }
  }

  update(dt) {
    if (this.screen === SCREENS.PLAYING) {
      this.levelTime += dt;
      this.movePlayer(dt);
      this.throwPebble();
      for (const mark of this.pebbleMarks) mark.ring = Math.min(1, mark.ring + dt * 1.5);
      this.pebbleMarks = this.pebbleMarks.filter((m) => m.ring < 1);

      let caught = false;
      for (const guard of this.guards) {
        const touch = guard.update(
          dt,
          this.grid,
          this.player,
          () => {
            this.timesSeen += 1;
            this.ghost = false;
            this.sounds.spotted();
          },
          (dist) => this.sounds.guardStep(dist),
        );
        if (touch) caught = true;
      }
      if (caught) {
        this.screen = SCREENS.CAUGHT;
        this.caughtTimer = 0;
        this.sounds.caught();
        return;
      }

      // Pick up a moon-moth by walking over it.
      for (const moth of this.moths) {
        if (!moth.taken && Math.hypot(moth.x - this.player.x, moth.y - this.player.y) < 0.7) {
          moth.taken = true;
          this.sounds.pickup();
          if (this.mothsTaken() === this.moths.length) {
            this.exitOpen = true;
            this.sounds.exitOpen();
          }
        }
      }

      // Reach the green door once it is open.
      if (this.exitOpen && Math.hypot(this.exit.x - this.player.x, this.exit.y - this.player.y) < 0.7) {
        this.totalTime += this.levelTime;
        this.screen = SCREENS.LEVEL_CLEAR;
        this.clearTimer = 0;
        this.sounds.levelClear();
      }
    } else if (this.screen === SCREENS.LEVEL_CLEAR) {
      this.clearTimer += dt;
      if (this.clearTimer > 2.4) this.nextLevel();
    } else if (this.screen === SCREENS.CAUGHT) {
      this.caughtTimer += dt;
    }
  }

  handleKeys() {
    const input = this.input;
    if (input.wasPressed('m') || input.wasPressed('M')) {
      this.sounds.ensure();
      this.sounds.toggleMute();
    }
    if (this.screen === SCREENS.TITLE) {
      if (input.wasPressed('Enter') || input.wasPressed(' ') || input.throwAt) {
        input.throwAt = null;
        this.startGame();
      }
    } else if (this.screen === SCREENS.CAUGHT) {
      if (this.caughtTimer > 0.6 && (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter') || input.wasPressed(' '))) {
        this.restartLevel();
      }
    } else if (this.screen === SCREENS.VICTORY) {
      if (input.wasPressed('Enter') || input.wasPressed(' ') || input.wasPressed('r') || input.wasPressed('R')) {
        this.startGame();
      }
    } else if (this.screen === SCREENS.PLAYING) {
      if (input.wasPressed('r') || input.wasPressed('R')) this.restartLevel();
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.handleKeys();
    this.update(dt);
    this.draw(now / 1000);
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  draw(time) {
    const r = this.renderer;
    r.clear();
    r.drawLevel(this.grid, this.moths, this.exit, this.exitOpen, time);
    for (const guard of this.guards) r.drawGuard(guard, time);
    r.drawPebbles(this.pebbleMarks);
    r.drawPlayer(this.player, time);
    if (this.screen === SCREENS.PLAYING || this.screen === SCREENS.LEVEL_CLEAR || this.screen === SCREENS.CAUGHT) {
      r.drawHud({
        levelName: `Level ${this.levelIndex + 1} — ${this.levelName}`,
        mothsTaken: this.mothsTaken(),
        mothsTotal: this.moths.length,
        pebbles: this.pebbles,
        timeText: formatTime(this.totalTime + this.levelTime),
        detection: highestDetection(this.guards),
        exitOpen: this.exitOpen,
      });
    }
    if (this.screen === SCREENS.TITLE) {
      r.drawTitle(this.levelName, this.intro);
    } else if (this.screen === SCREENS.LEVEL_CLEAR) {
      const last = this.levelIndex + 1 >= LEVELS.length;
      r.panel(last ? 'Wing cleared!' : 'Level clear!', [
        `All ${this.moths.length} moon-moths stolen in ${formatTime(this.levelTime)}.`,
        last ? 'One wing left between you and dawn.' : 'The next wing waits. Stay quiet.',
      ], '#7ee2a8');
    } else if (this.screen === SCREENS.CAUGHT) {
      r.panel('CAUGHT!', [
        `A watchman's lantern found you on level ${this.levelIndex + 1}.`,
        'Press R to try the wing again — slower, darker, quieter.',
      ], '#ff5a5a');
    } else if (this.screen === SCREENS.VICTORY) {
      const lines = [
        `Every moth stolen in ${formatTime(this.totalTime)}.`,
        this.ghost
          ? 'Ghost: no watchman ever raised the alarm. The museum never knew you were there.'
          : `The alarm was raised ${this.timesSeen} time${this.timesSeen === 1 ? '' : 's'} — but dawn is yours anyway.`,
        `Pebbles thrown: ${this.pebblesUsed}.`,
        'Press ENTER to steal again.',
      ];
      r.panel('DAWN BREAKS — YOU DID IT!', lines, '#ffe9a3');
    }
  }
}

// Staged screenshot mode: ?shot=start|play|end&seed=N renders one fixed scene
// and never starts the loop, so the picture is identical every time.
function runShotMode() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
  const staged = stageShot(shot, seed);
  const canvas = document.getElementById('game');
  const renderer = new Renderer(canvas);
  const time = 1.2;
  renderer.clear();
  renderer.drawLevel(staged.grid, staged.moths, staged.exit, staged.exitOpen, time);
  for (const guard of staged.guards) renderer.drawGuard(guard, time);
  renderer.drawPebbles(staged.pebbleMarks);
  renderer.drawPlayer(staged.player, time);
  if (staged.screen === 'playing') {
    renderer.drawHud({
      levelName: `Level ${staged.levelIndex + 1} — ${staged.levelName}`,
      mothsTaken: staged.moths.filter((m) => m.taken).length,
      mothsTotal: staged.moths.length,
      pebbles: staged.pebbles,
      timeText: formatTime(staged.elapsed),
      detection: highestDetection(staged.guards),
      exitOpen: staged.exitOpen,
    });
  } else if (staged.screen === 'title') {
    renderer.drawTitle(staged.levelName, staged.intro);
  } else if (staged.screen === 'victory') {
    renderer.panel('DAWN BREAKS — YOU DID IT!', [
      `Every moth stolen in ${formatTime(staged.finalTime)}.`,
      'Ghost: no watchman ever raised the alarm. The museum never knew you were there.',
      `Pebbles thrown: ${staged.pebblesUsed}.`,
      'Press ENTER to steal again.',
    ], '#ffe9a3');
  }
  document.title = `MOTHLIGHT — shot ${shot}`;
  return true;
}

if (!runShotMode()) {
  new Mothlight();
}
