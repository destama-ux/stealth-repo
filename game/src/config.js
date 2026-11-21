// MOTHLIGHT — shared tuning constants and the colour palette.
// One clear job: every number and colour the rest of the game reads lives here.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 800

export const PLAYER_SPEED = 4.6; // tiles per second, walking
export const PLAYER_SNEAK_SPEED = 2.6; // tiles per second, sneaking
export const GUARD_SPEED = 2.1; // tiles per second on patrol
export const GUARD_CHASE_SPEED = 3.4; // tiles per second while alert
export const GUARD_INVESTIGATE_SPEED = 2.6;

export const CONE_RANGE = 5.6; // tiles a guard can see
export const CONE_HALF_ANGLE = 0.61; // radians (~35 degrees each side)
export const SHADOW_SIGHT_FACTOR = 0.45; // how much harder you are to spot in shadow
export const SNEAK_SIGHT_FACTOR = 0.6; // how much harder you are to spot while sneaking
export const RUN_SIGHT_FACTOR = 1.25; // walking (not sneaking) is easier to spot

export const DETECT_FILL_RATE = 1.35; // detection per second at point blank
export const DETECT_DRAIN_RATE = 0.45; // detection per second while unseen
export const ALERT_MEMORY = 2.5; // seconds a guard keeps chasing after losing sight
export const SEARCH_TIME = 3.0; // seconds a guard searches the last seen spot

export const PEBBLES_PER_LEVEL = 3;
export const PEBBLE_RANGE = 7.5; // tiles, how far you can throw
export const PEBBLE_HEAR_RADIUS = 6.5; // tiles, guards that hear the clink

export const CATCH_DISTANCE = 0.62; // tiles, guard touch = caught

export const PALETTE = {
  floorA: '#2b2f3a',
  floorB: '#272b35',
  floorEdge: '#1d2029',
  shadowFloor: '#171a26',
  shadowGlow: '#232a4a',
  wall: '#4a4238',
  wallTop: '#6b5f4e',
  wallEdge: '#241f18',
  crate: '#7a5a33',
  crateDark: '#5d4426',
  crateEdge: '#3d2d18',
  moth: '#ffe9a3',
  mothGlow: '#ffcf4d',
  exit: '#7ee2a8',
  exitGlow: '#2fae6e',
  player: '#e8e4d8',
  playerCloak: '#5b6ee1',
  guard: '#d8b25c',
  guardDark: '#8a6d2f',
  cone: 'rgba(255, 214, 110, 0.20)',
  coneEdge: 'rgba(255, 214, 110, 0.45)',
  coneAlert: 'rgba(255, 84, 84, 0.28)',
  hudBack: 'rgba(10, 12, 20, 0.82)',
  text: '#f2ead8',
  textDim: '#a9a58f',
  danger: '#ff5a5a',
  warn: '#ffc44d',
  safe: '#7ee2a8',
};

// Deterministic random source: mulberry32, so staged shots render the same every time.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
