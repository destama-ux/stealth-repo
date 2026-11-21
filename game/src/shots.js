// MOTHLIGHT — deterministic staged screenshots.
// One clear job: the ?shot=start|play|end&seed=N modes render a fixed, readable
// scene of the game, so the screenshots are real renders of this code.

import { LEVELS, parseLevel } from './levels.js';
import { Guard, GUARD_STATES } from './guards.js';

// Build a fully staged game state for one shot. Every position is fixed by the
// seed, so the same URL always renders the same picture.
export function stageShot(shot, seed) {
  const rng = mulberry32ish(seed);
  if (shot === 'start') {
    // Title screen over level 1, guards mid-patrol with their cones sweeping.
    const game = baseGame(0);
    game.guards[0].x = 22.5;
    game.guards[0].y = 3.5;
    game.guards[0].facing = Math.PI * 0.75;
    game.guards[1].x = 10.5;
    game.guards[1].y = 15.5;
    game.guards[1].facing = -Math.PI * 0.25;
    game.screen = 'title';
    return game;
  }
  if (shot === 'end') {
    // Victory screen over level 3, every moth taken, the exit glowing.
    const game = baseGame(2);
    for (const moth of game.moths) moth.taken = true;
    game.exitOpen = true;
    game.player.x = 27.5;
    game.player.y = 16.5;
    game.player.moving = false;
    game.screen = 'victory';
    game.finalTime = 187.4;
    game.timesSeen = 2;
    game.pebblesUsed = 2;
    return game;
  }
  // Default: 'play' — mid-level action on level 2. The thief crouches behind a
  // crate beside the exit wing while a watchman's cone sweeps toward her,
  // detection half full, two moths already in the bag.
  const game = baseGame(1);
  game.moths[0].taken = true;
  game.moths[2].taken = true;
  game.player.x = 13.5;
  game.player.y = 15.5;
  game.player.sneaking = true;
  game.player.moving = false;
  game.pebbles = 2;
  game.pebbleMarks = [{ x: 19.5, y: 13.5, ring: 0.4 }];
  const g0 = game.guards[0];
  g0.x = 21.5;
  g0.y = 4.5;
  g0.facing = Math.PI * 0.85;
  g0.state = GUARD_STATES.SUSPICIOUS;
  g0.detection = 0.55;
  g0.lastSeen = { x: 13.5, y: 15.5 };
  const g1 = game.guards[1];
  g1.x = 10.5;
  g1.y = 10.5;
  g1.facing = Math.PI * 0.1;
  const g2 = game.guards[2];
  g2.x = 20.5;
  g2.y = 16.5;
  g2.facing = -Math.PI * 0.6;
  g2.state = GUARD_STATES.INVESTIGATE;
  g2.noiseTarget = { x: 19.5, y: 13.5 };
  game.elapsed = 74.2;
  game.screen = 'playing';
  void rng;
  return game;
}

function mulberry32ish(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A playable-shaped state object for a level, without starting the loop.
function baseGame(levelIndex) {
  const def = LEVELS[levelIndex];
  const parsed = parseLevel(def);
  return {
    levelIndex,
    levelName: def.name,
    intro: def.intro,
    grid: parsed.grid,
    player: { x: parsed.player.x, y: parsed.player.y, moving: false, sneaking: false },
    guards: def.guards.map((g) => new Guard(g)),
    moths: parsed.moths,
    exit: parsed.exit,
    exitOpen: false,
    pebbles: 3,
    pebbleMarks: [],
    elapsed: 0,
    screen: 'playing',
    finalTime: 0,
    timesSeen: 0,
    pebblesUsed: 0,
    time: 0,
  };
}
