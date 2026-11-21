// MOTHLIGHT — guard behaviour and the detection system.
// One clear job: patrols, vision cones, suspicion, chase, and being caught.

import {
  CONE_RANGE,
  CONE_HALF_ANGLE,
  SHADOW_SIGHT_FACTOR,
  SNEAK_SIGHT_FACTOR,
  RUN_SIGHT_FACTOR,
  DETECT_FILL_RATE,
  DETECT_DRAIN_RATE,
  ALERT_MEMORY,
  SEARCH_TIME,
  GUARD_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  CATCH_DISTANCE,
} from './config.js';
import { hasLineOfSight, isShadow, isSolid } from './levels.js';

export const GUARD_STATES = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALERT: 'alert',
  INVESTIGATE: 'investigate',
  SEARCH: 'search',
};

// A guard's facing angle, from its current movement direction.
function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(def) {
    this.x = def.spawn[0] + 0.5;
    this.y = def.spawn[1] + 0.5;
    this.waypoints = def.waypoints.map(([wx, wy]) => ({ x: wx + 0.5, y: wy + 0.5 }));
    this.pause = def.pause ?? 1.0;
    this.wpIndex = 1 % this.waypoints.length;
    this.facing = angleTo(this.x, this.y, this.waypoints[this.wpIndex].x, this.waypoints[this.wpIndex].y);
    this.state = GUARD_STATES.PATROL;
    this.detection = 0; // 0 unseen .. 1 fully spotted
    this.pauseTimer = 0;
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.lastSeen = null; // {x, y} where the player was last spotted
    this.noiseTarget = null; // {x, y} a pebble landed on
    this.stepTimer = 0;
    this.suspicionFlash = 0;
  }

  // Can this guard see the player right now? Returns a 0..1 visibility score.
  canSee(grid, player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE) return 0;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, this.facing)) > CONE_HALF_ANGLE) return 0;
    if (!hasLineOfSight(grid, this.x, this.y, player.x, player.y)) return 0;
    let score = 1 - dist / CONE_RANGE;
    if (isShadow(grid, Math.floor(player.x), Math.floor(player.y))) score *= SHADOW_SIGHT_FACTOR;
    score *= player.sneaking ? SNEAK_SIGHT_FACTOR : RUN_SIGHT_FACTOR;
    return Math.max(0, Math.min(1, score));
  }

  // Move toward a target point without crossing a wall or a crate.
  moveToward(grid, tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    // Axis-separated sliding so guards hug walls instead of sticking on corners.
    if (!isSolid(grid, Math.floor(nx), Math.floor(this.y))) this.x = nx;
    if (!isSolid(grid, Math.floor(this.x), Math.floor(ny))) this.y = ny;
    this.facing = angleTo(this.x, this.y, tx, ty);
    return dist - step < 0.05;
  }

  // The pebble's clink: a guard close enough walks over to look.
  hearNoise(x, y) {
    if (this.state === GUARD_STATES.ALERT) return;
    this.noiseTarget = { x, y };
    this.state = GUARD_STATES.INVESTIGATE;
    this.searchTimer = 0;
  }

  update(dt, grid, player, onSpotted, onFootstep) {
    const visibility = this.canSee(grid, player);
    const seen = visibility > 0.02;

    if (seen) {
      const before = this.detection;
      this.detection = Math.min(1, this.detection + DETECT_FILL_RATE * visibility * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
      if (before < 0.5 && this.detection >= 0.5 && this.state !== GUARD_STATES.ALERT) {
        this.state = GUARD_STATES.SUSPICIOUS;
        this.suspicionFlash = 1.2;
      }
      if (this.detection >= 1 && this.state !== GUARD_STATES.ALERT) {
        this.state = GUARD_STATES.ALERT;
        onSpotted();
      }
    } else {
      this.detection = Math.max(0, this.detection - DETECT_DRAIN_RATE * dt);
      if (this.state === GUARD_STATES.SUSPICIOUS && this.detection < 0.25) {
        this.state = GUARD_STATES.PATROL;
      }
    }
    if (this.suspicionFlash > 0) this.suspicionFlash -= dt;

    // Footsteps: the nearer the guard, the louder the tread.
    this.stepTimer -= dt;
    if (this.stepTimer <= 0 && (this.state === GUARD_STATES.PATROL || this.state === GUARD_STATES.ALERT)) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      onFootstep(dist);
      this.stepTimer = this.state === GUARD_STATES.ALERT ? 0.32 : 0.55;
    }

    switch (this.state) {
      case GUARD_STATES.PATROL: {
        if (this.pauseTimer > 0) {
          this.pauseTimer -= dt;
          break;
        }
        const target = this.waypoints[this.wpIndex];
        if (this.moveToward(grid, target.x, target.y, GUARD_SPEED, dt)) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.pauseTimer = this.pause;
        }
        break;
      }
      case GUARD_STATES.SUSPICIOUS: {
        // Turn toward the glimpse and hold, listening.
        if (this.lastSeen) {
          const want = angleTo(this.x, this.y, this.lastSeen.x, this.lastSeen.y);
          this.facing += Math.max(-2.4 * dt, Math.min(2.4 * dt, angleDiff(want, this.facing)));
        }
        break;
      }
      case GUARD_STATES.ALERT: {
        if (seen) {
          this.moveToward(grid, player.x, player.y, GUARD_CHASE_SPEED, dt);
        } else {
          this.loseSightTimer += dt;
          if (this.lastSeen) this.moveToward(grid, this.lastSeen.x, this.lastSeen.y, GUARD_CHASE_SPEED, dt);
          if (this.loseSightTimer > ALERT_MEMORY) {
            this.state = GUARD_STATES.SEARCH;
            this.searchTimer = SEARCH_TIME;
          }
        }
        break;
      }
      case GUARD_STATES.INVESTIGATE: {
        if (this.noiseTarget) {
          if (this.moveToward(grid, this.noiseTarget.x, this.noiseTarget.y, GUARD_INVESTIGATE_SPEED, dt)) {
            this.state = GUARD_STATES.SEARCH;
            this.searchTimer = SEARCH_TIME;
            this.noiseTarget = null;
          }
        }
        break;
      }
      case GUARD_STATES.SEARCH: {
        this.searchTimer -= dt;
        this.facing += dt * 1.8; // sweep the lantern around while looking
        if (this.searchTimer <= 0) {
          this.state = GUARD_STATES.PATROL;
          this.detection = Math.min(this.detection, 0.3);
        }
        break;
      }
    }

    // A guard that reaches the player has caught them.
    const touch = Math.hypot(player.x - this.x, player.y - this.y);
    return touch < CATCH_DISTANCE;
  }
}

// Shared detection: the highest any guard's meter has climbed.
export function highestDetection(guards) {
  let top = 0;
  for (const g of guards) top = Math.max(top, g.detection);
  return top;
}
