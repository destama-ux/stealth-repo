// MOTHLIGHT — level definitions.
// One clear job: the three hand-drawn maps and the guards that patrol them.
// Legend: # wall, . floor, , shadow floor (hides you), C crate (cover, blocks
// sight and movement), P player start, O moon-moth objective, E exit,
// G guard spawn (its patrol waypoints are listed beside the map).

export const LEVELS = [
  {
    name: 'The Quiet Gallery',
    intro: 'Three moon-moths sleep in the gallery. Take them all, then slip out the green door.',
    map: [
      '################################',
      '#P......,,.....#......O........#',
      '#......,,.....#................#',
      '#..C...,,..C..#....C.......C...#',
      '#......,,.....#................#',
      '#......,,.....#.....,,.........#',
      '###.####.######.....,,....######',
      '#......,,.....#.....,,.........#',
      '#..O...,,..C..#..C....C....O...#',
      '#......,,.....#................#',
      '#......,,.....#.....,,....C....#',
      '#..C...,,.....#.....,,.........#',
      '###.####.######.....,,....######',
      '#......,,.....#................#',
      '#..C.......C..#..C......C......#',
      '#..............................#',
      '#.....,,......C.....,,.....E...#',
      '#.....,,...........,,..........#',
      '#.....,,...........,,..........#',
      '################################',
    ],
    guards: [
      { spawn: [24, 2], waypoints: [[24, 2], [24, 5], [18, 5], [18, 2]], pause: 1.2 },
      { spawn: [8, 16], waypoints: [[8, 16], [8, 13], [13, 13], [13, 16]], pause: 1.0 },
    ],
  },
  {
    name: 'The Stacks',
    intro: 'The archive stacks are tall and dark. Four moths, three watchmen, and nowhere to run.',
    map: [
      '################################',
      '#P.....,,....C.......O.........#',
      '#......,,......................#',
      '#..C...,,...C...,,....C....C...#',
      '#......,,.......,,.............#',
      '#......,,...C...,,...C.........#',
      '###.######.#####.#####.####.####',
      '#......,,.......,,.............#',
      '#..O...,,...C...,,....C....O...#',
      '#......,,.......,,.............#',
      '#..C...,,...C...,,...C....C....#',
      '#......,,.......,,.............#',
      '###.######.#####.#####.####.####',
      '#......,,.......,,.............#',
      '#..C...,,...C...,,....C....O...#',
      '#......,,.......,,.............#',
      '#.....,,....C.......,,.....E...#',
      '#.....,,............,,.........#',
      '#.....,,............,,.........#',
      '################################',
    ],
    guards: [
      { spawn: [26, 2], waypoints: [[26, 2], [26, 4], [17, 4], [17, 2]], pause: 1.0 },
      { spawn: [6, 9], waypoints: [[6, 9], [6, 11], [15, 11], [15, 9]], pause: 1.4 },
      { spawn: [24, 15], waypoints: [[24, 15], [24, 18], [8, 18], [8, 15]], pause: 0.8 },
    ],
  },
  {
    name: 'The Vault Wing',
    intro: 'Five moths behind the vault doors. Four watchmen, and the light never rests.',
    map: [
      '################################',
      '#P.....,,....C....O....,,......#',
      '#......,,.........C...,,.......#',
      '#..C...,,...C........,,...C....#',
      '#......,,.......C....,,........#',
      '#..O...,,...C........,,....O...#',
      '###.######.#####.######.####.###',
      '#......,,.......,,....C........#',
      '#..C...,,...C...,,........C....#',
      '#......,,.......,,.............#',
      '#..O...,,...C...,,....C....O...#',
      '#......,,.......,,.............#',
      '###.######.#####.######.####.###',
      '#......,,.......,,....C........#',
      '#..C...,,...C...,,........C....#',
      '#......,,.......,,.............#',
      '#.....,,....C.......,,.....E...#',
      '#.....,,............,,.........#',
      '#.....,,............,,.........#',
      '################################',
    ],
    guards: [
      { spawn: [25, 2], waypoints: [[25, 2], [25, 5], [17, 5], [17, 3], [25, 3]], pause: 0.9 },
      { spawn: [6, 9], waypoints: [[6, 9], [6, 11], [25, 11], [25, 9]], pause: 1.2 },
      { spawn: [15, 14], waypoints: [[15, 14], [15, 17], [24, 17], [24, 14]], pause: 1.0 },
      { spawn: [24, 14], waypoints: [[24, 14], [24, 17], [16, 17], [16, 14]], pause: 1.3 },
    ],
  },
];

// Parse one level's ASCII map into a grid plus entity spawn points.
// Returns { grid, player, moths, exit, shadow } where grid holds '#' | '.' | ',' | 'C'.
export function parseLevel(levelDef) {
  const grid = [];
  let player = null;
  const moths = [];
  let exit = null;
  for (let y = 0; y < levelDef.map.length; y++) {
    const row = levelDef.map[y];
    const gridRow = [];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === 'P') { player = { x: x + 0.5, y: y + 0.5 }; gridRow.push('.'); }
      else if (ch === 'O') { moths.push({ x: x + 0.5, y: y + 0.5, taken: false }); gridRow.push('.'); }
      else if (ch === 'E') { exit = { x: x + 0.5, y: y + 0.5 }; gridRow.push('.'); }
      else if (ch === 'G') { gridRow.push('.'); }
      else gridRow.push(ch);
    }
    grid.push(gridRow);
  }
  return { grid, player, moths, exit };
}

// A tile blocks movement (walls and crates) or sight (walls and crates).
export function isSolid(grid, tx, ty) {
  if (tx < 0 || ty < 0 || ty >= grid.length || tx >= grid[0].length) return true;
  const ch = grid[ty][tx];
  return ch === '#' || ch === 'C';
}

export function isShadow(grid, tx, ty) {
  if (tx < 0 || ty < 0 || ty >= grid.length || tx >= grid[0].length) return false;
  return grid[ty][tx] === ',';
}

// Line of sight between two tile-space points, blocked by walls and crates.
// Steps along the segment in small increments and checks each tile it enters.
export function hasLineOfSight(grid, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist * 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor(ax + dx * t);
    const ty = Math.floor(ay + dy * t);
    if (isSolid(grid, tx, ty)) return false;
  }
  return true;
}
