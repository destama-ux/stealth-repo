// MOTHLIGHT — everything drawn on the canvas.
// One clear job: the level, the actors, the cones, the HUD and the screens.

import { TILE, VIEW_W, VIEW_H, CONE_RANGE, CONE_HALF_ANGLE, PALETTE } from './config.js';
import { GUARD_STATES } from './guards.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  clear() {
    this.ctx.fillStyle = '#10121a';
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawLevel(grid, moths, exit, exitOpen, time) {
    const ctx = this.ctx;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const ch = grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (ch === '#') {
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(px, py, TILE, 7);
          ctx.fillStyle = PALETTE.wallEdge;
          ctx.fillRect(px, py + TILE - 3, TILE, 3);
          ctx.fillRect(px + TILE - 3, py, 3, TILE);
        } else {
          const shadow = ch === ',';
          ctx.fillStyle = shadow ? PALETTE.shadowFloor : (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
          ctx.fillRect(px, py, TILE, TILE);
          if (shadow) {
            ctx.fillStyle = PALETTE.shadowGlow;
            ctx.globalAlpha = 0.25 + 0.1 * Math.sin(time * 1.4 + x * 0.7 + y);
            ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = PALETTE.floorEdge;
          ctx.fillRect(px, py + TILE - 1, TILE, 1);
          ctx.fillRect(px + TILE - 1, py, 1, TILE);
        }
        if (ch === 'C') {
          ctx.fillStyle = PALETTE.crate;
          roundRect(ctx, px + 4, py + 4, TILE - 8, TILE - 8, 4);
          ctx.fill();
          ctx.strokeStyle = PALETTE.crateEdge;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 4);
          ctx.lineTo(px + TILE - 4, py + TILE - 4);
          ctx.moveTo(px + TILE - 4, py + 4);
          ctx.lineTo(px + 4, py + TILE - 4);
          ctx.stroke();
        }
      }
    }

    // The exit: a green doorway that lights up once every moth is taken.
    const ex = exit.x * TILE;
    const ey = exit.y * TILE;
    ctx.save();
    ctx.globalAlpha = exitOpen ? 0.95 : 0.45;
    ctx.fillStyle = exitOpen ? PALETTE.exitGlow : '#3d6b52';
    roundRect(ctx, ex - 17, ey - 17, 34, 34, 6);
    ctx.fill();
    ctx.fillStyle = exitOpen ? PALETTE.exit : '#6fae8c';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', ex, ey);
    if (exitOpen) {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 3);
      ctx.fillStyle = PALETTE.exit;
      ctx.beginPath();
      ctx.arc(ex, ey, 30 + 4 * Math.sin(time * 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Moon-moths: glowing orbs that bob and pulse.
    for (const moth of moths) {
      if (moth.taken) continue;
      const mx = moth.x * TILE;
      const my = moth.y * TILE + Math.sin(time * 2.2 + moth.x) * 3;
      const pulse = 0.5 + 0.5 * Math.sin(time * 3 + moth.y);
      const glow = ctx.createRadialGradient(mx, my, 2, mx, my, 26 + pulse * 8);
      glow.addColorStop(0, 'rgba(255, 233, 163, 0.85)');
      glow.addColorStop(1, 'rgba(255, 207, 77, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mx, my, 26 + pulse * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.moth;
      ctx.beginPath();
      ctx.arc(mx, my, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5c00';
      ctx.beginPath();
      ctx.arc(mx - 2.5, my - 1, 1.6, 0, Math.PI * 2);
      ctx.arc(mx + 2.5, my - 1, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCone(guard, alert) {
    const ctx = this.ctx;
    const gx = guard.x * TILE;
    const gy = guard.y * TILE;
    const range = CONE_RANGE * TILE;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.arc(gx, gy, range, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
    ctx.closePath();
    const grad = ctx.createRadialGradient(gx, gy, 10, gx, gy, range);
    if (alert) {
      grad.addColorStop(0, 'rgba(255, 84, 84, 0.4)');
      grad.addColorStop(1, 'rgba(255, 84, 84, 0.05)');
    } else {
      grad.addColorStop(0, 'rgba(255, 214, 110, 0.35)');
      grad.addColorStop(1, 'rgba(255, 214, 110, 0.03)');
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = alert ? 'rgba(255, 84, 84, 0.5)' : PALETTE.coneEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  drawGuard(guard, time) {
    const ctx = this.ctx;
    const gx = guard.x * TILE;
    const gy = guard.y * TILE;
    const alert = guard.state === GUARD_STATES.ALERT;
    this.drawCone(guard, alert);

    // Lantern light pool around the watchman.
    const pool = ctx.createRadialGradient(gx, gy, 4, gx, gy, 46);
    pool.addColorStop(0, alert ? 'rgba(255, 120, 90, 0.35)' : 'rgba(255, 214, 110, 0.3)');
    pool.addColorStop(1, 'rgba(255, 214, 110, 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(gx, gy, 46, 0, Math.PI * 2);
    ctx.fill();

    // Body: a night watchman in a brass-buttoned coat, lantern in hand.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(gx + 3, gy + 5, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = alert ? '#c94f4f' : PALETTE.guard;
    ctx.beginPath();
    ctx.arc(gx, gy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath();
    ctx.arc(gx, gy, 13, 0, Math.PI * 2);
    ctx.globalAlpha = 0.0;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Cap brim points where he looks.
    const bx = gx + Math.cos(guard.facing) * 12;
    const by = gy + Math.sin(guard.facing) * 12;
    ctx.strokeStyle = '#3a2f16';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(bx, by);
    ctx.stroke();
    // Eyes.
    ctx.fillStyle = '#1c1508';
    ctx.beginPath();
    ctx.arc(gx + Math.cos(guard.facing - 0.4) * 6, gy + Math.sin(guard.facing - 0.4) * 6, 1.8, 0, Math.PI * 2);
    ctx.arc(gx + Math.cos(guard.facing + 0.4) * 6, gy + Math.sin(guard.facing + 0.4) * 6, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Detection ring above his head, and ? / ! marks.
    if (guard.detection > 0.03) {
      ctx.strokeStyle = guard.detection > 0.66 ? PALETTE.danger : PALETTE.warn;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gx, gy - 24, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.detection);
      ctx.stroke();
    }
    let mark = '';
    if (guard.state === GUARD_STATES.ALERT) mark = '!';
    else if (guard.state === GUARD_STATES.SUSPICIOUS || guard.state === GUARD_STATES.SEARCH) mark = '?';
    else if (guard.state === GUARD_STATES.INVESTIGATE) mark = '…';
    if (mark) {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = guard.state === GUARD_STATES.ALERT ? PALETTE.danger : PALETTE.warn;
      ctx.fillText(mark, gx, gy - 40 + Math.sin(time * 4) * 2);
    }
  }

  drawPlayer(player, time) {
    const ctx = this.ctx;
    const px = player.x * TILE;
    const py = player.y * TILE;
    const bob = Math.sin(time * 6) * (player.moving ? 1.5 : 0.5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px + 2, py + 6, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded moth-thief: a deep-blue cloak, pale hood, and a moth pin.
    ctx.fillStyle = PALETTE.playerCloak;
    ctx.beginPath();
    ctx.moveTo(px, py - 14 + bob);
    ctx.lineTo(px - 11, py + 9);
    ctx.lineTo(px + 11, py + 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(px, py - 6 + bob, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c2c34';
    ctx.beginPath();
    ctx.arc(px - 2.5, py - 7 + bob, 1.5, 0, Math.PI * 2);
    ctx.arc(px + 2.5, py - 7 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (player.sneaking) {
      ctx.strokeStyle = 'rgba(126, 226, 168, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(px, py, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawPebbles(pebbles) {
    const ctx = this.ctx;
    for (const p of pebbles) {
      ctx.fillStyle = '#cfc8b0';
      ctx.beginPath();
      ctx.arc(p.x * TILE, p.y * TILE, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x * TILE, p.y * TILE, 8 + p.ring * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawHud(state) {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.hudBack;
    ctx.fillRect(0, 0, VIEW_W, 52);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`MOTHLIGHT  ·  ${state.levelName}`, 16, 27);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    const mothText = `Moths ${state.mothsTaken}/${state.mothsTotal}`;
    ctx.fillText(mothText, 330, 27);
    ctx.fillText(`Pebbles ${state.pebbles}`, 470, 27);
    ctx.fillText(`Time ${state.timeText}`, 590, 27);
    if (state.exitOpen) {
      ctx.fillStyle = PALETTE.safe;
      ctx.fillText('EXIT OPEN — run for the green door!', 700, 27);
    }
    // Detection meter, top right: fills red as any guard spots you.
    const mx = VIEW_W - 260;
    ctx.fillStyle = '#3a2020';
    roundRect(ctx, mx, 17, 200, 18, 9);
    ctx.fill();
    const d = state.detection;
    ctx.fillStyle = d > 0.66 ? PALETTE.danger : d > 0.33 ? PALETTE.warn : PALETTE.safe;
    if (d > 0.01) {
      roundRect(ctx, mx + 2, 19, 196 * d, 14, 7);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SEEN', mx - 52, 27);
    ctx.textAlign = 'right';
    ctx.fillText(d > 0.66 ? 'SPOTTED!' : d > 0.33 ? 'suspicious' : 'hidden', VIEW_W - 16, 27);
    ctx.textAlign = 'left';
    // Bottom hint line.
    ctx.fillStyle = 'rgba(10, 12, 20, 0.7)';
    ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '13px sans-serif';
    ctx.fillText('WASD / arrows move · Shift sneak · Click throw a pebble · R restart level · M mute', 16, VIEW_H - 13);
  }

  panel(title, lines, accent) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 10, 18, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = accent;
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, VIEW_W / 2, 300);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '19px sans-serif';
    let y = 372;
    for (const line of lines) {
      ctx.fillText(line, VIEW_W / 2, y);
      y += 32;
    }
  }

  drawTitle(levelName, intro) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 10, 18, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = PALETTE.moth;
    ctx.font = 'bold 84px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MOTHLIGHT', VIEW_W / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '21px sans-serif';
    ctx.fillText('A silent heist in three wings of the night museum', VIEW_W / 2, 315);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '17px sans-serif';
    ctx.fillText('Steal every moon-moth. Stay out of the lantern light. Reach the green door unseen.', VIEW_W / 2, 350);
    ctx.fillStyle = PALETTE.safe;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Level 1 — ${levelName}`, VIEW_W / 2, 420);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px sans-serif';
    ctx.fillText(intro, VIEW_W / 2, 452);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px sans-serif';
    const blink = 0.6 + 0.4 * Math.sin(Date.now() / 350);
    ctx.globalAlpha = blink;
    ctx.fillText('Press ENTER or click to begin', VIEW_W / 2, 540);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '15px sans-serif';
    ctx.fillText('WASD / arrows to move · Shift to sneak · Click to throw a pebble · R restart · M mute', VIEW_W / 2, 580);
  }
}
