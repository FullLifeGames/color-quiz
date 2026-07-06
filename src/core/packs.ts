/** The 30 level packs: original names and Oklch palette definitions. */
import type { Palette } from './color';

export interface PackDef {
  id: string;
  name: { de: string; en: string };
  palette: Palette;
}

export const LEVELS_PER_PACK = 24;
export const UNLOCK_THRESHOLD = 12;

const p = (
  hueBase: number,
  hueSpan: number,
  chromaRange: [number, number],
  lightRange: [number, number],
  mode?: 'oklab' | 'oklch'
): Palette => ({ hueBase, hueSpan, chromaRange, lightRange, mode });

export const PACKS: PackDef[] = [
  { id: 'morgenrot', name: { de: 'Morgenrot', en: 'Dawn' }, palette: p(25, 110, [0.08, 0.14], [0.62, 0.92]) },
  { id: 'lagune', name: { de: 'Lagune', en: 'Lagoon' }, palette: p(200, 100, [0.08, 0.14], [0.58, 0.9]) },
  { id: 'wiese', name: { de: 'Wiese', en: 'Meadow' }, palette: p(125, 105, [0.09, 0.16], [0.55, 0.9]) },
  { id: 'flieder', name: { de: 'Flieder', en: 'Lilac' }, palette: p(315, 95, [0.07, 0.13], [0.6, 0.92]) },
  { id: 'ozean', name: { de: 'Ozean', en: 'Ocean' }, palette: p(240, 90, [0.09, 0.16], [0.45, 0.85]) },
  { id: 'zitrus', name: { de: 'Zitrus', en: 'Citrus' }, palette: p(90, 95, [0.11, 0.18], [0.62, 0.93]) },
  { id: 'koralle', name: { de: 'Koralle', en: 'Coral' }, palette: p(20, 120, [0.1, 0.16], [0.58, 0.88]) },
  { id: 'nebel', name: { de: 'Nebel', en: 'Mist' }, palette: p(230, 130, [0.04, 0.09], [0.5, 0.95]) },
  { id: 'honig', name: { de: 'Honig', en: 'Honey' }, palette: p(70, 75, [0.1, 0.16], [0.55, 0.9]) },
  { id: 'polarlicht', name: { de: 'Polarlicht', en: 'Aurora' }, palette: p(170, 140, [0.1, 0.17], [0.5, 0.87]) },
  { id: 'wueste', name: { de: 'Wüste', en: 'Desert' }, palette: p(55, 70, [0.07, 0.12], [0.55, 0.88]) },
  { id: 'tropen', name: { de: 'Tropen', en: 'Tropics' }, palette: p(150, 150, [0.12, 0.19], [0.55, 0.88]) },
  { id: 'beeren', name: { de: 'Beeren', en: 'Berries' }, palette: p(345, 100, [0.1, 0.17], [0.45, 0.82]) },
  { id: 'eis', name: { de: 'Eis', en: 'Ice' }, palette: p(215, 110, [0.04, 0.11], [0.55, 0.97]) },
  { id: 'wald', name: { de: 'Wald', en: 'Forest' }, palette: p(140, 85, [0.06, 0.13], [0.38, 0.78]) },
  { id: 'kirschbluete', name: { de: 'Kirschblüte', en: 'Blossom' }, palette: p(350, 120, [0.05, 0.12], [0.58, 0.96]) },
  { id: 'vulkan', name: { de: 'Vulkan', en: 'Volcano' }, palette: p(30, 85, [0.1, 0.18], [0.35, 0.75]) },
  { id: 'jade', name: { de: 'Jade', en: 'Jade' }, palette: p(165, 80, [0.08, 0.14], [0.48, 0.85]) },
  { id: 'sturm', name: { de: 'Sturm', en: 'Storm' }, palette: p(250, 110, [0.05, 0.12], [0.36, 0.88]) },
  { id: 'pastell', name: { de: 'Pastell', en: 'Pastel' }, palette: p(60, 170, [0.05, 0.11], [0.62, 0.96]) },
  { id: 'kupfer', name: { de: 'Kupfer', en: 'Copper' }, palette: p(45, 130, [0.07, 0.13], [0.5, 0.85]) },
  { id: 'mitternacht', name: { de: 'Mitternacht', en: 'Midnight' }, palette: p(275, 105, [0.06, 0.14], [0.28, 0.8]) },
  { id: 'moos', name: { de: 'Moos', en: 'Moss' }, palette: p(115, 100, [0.06, 0.14], [0.38, 0.9]) },
  { id: 'rubin', name: { de: 'Rubin', en: 'Ruby' }, palette: p(5, 95, [0.1, 0.17], [0.36, 0.88]) },
  { id: 'galaxie', name: { de: 'Galaxie', en: 'Galaxy' }, palette: p(290, 130, [0.08, 0.16], [0.3, 0.85]) },
  { id: 'aquarell', name: { de: 'Aquarell', en: 'Watercolor' }, palette: p(190, 180, [0.06, 0.12], [0.55, 0.95]) },
  { id: 'glut', name: { de: 'Glut', en: 'Embers' }, palette: p(35, 85, [0.11, 0.18], [0.38, 0.9]) },
  { id: 'daemmerung', name: { de: 'Dämmerung', en: 'Dusk' }, palette: p(300, 150, [0.07, 0.14], [0.42, 0.9]) },
  { id: 'regenbogen', name: { de: 'Regenbogen', en: 'Rainbow' }, palette: p(0, 300, [0.11, 0.16], [0.6, 0.88], 'oklch') },
  { id: 'prisma', name: { de: 'Prisma', en: 'Prism' }, palette: p(180, 330, [0.1, 0.16], [0.5, 0.85], 'oklch') }
];

/**
 * Difficulty in [0, 1]: rises globally across packs and within each pack,
 * so every pack starts gentler than it ends.
 */
export function difficulty(packIdx: number, levelIdx: number): number {
  const acrossPacks = PACKS.length === 1 ? 0 : packIdx / (PACKS.length - 1);
  const inPack = levelIdx / (LEVELS_PER_PACK - 1);
  return Math.min(1, 0.62 * acrossPacks + 0.34 * inPack + 0.04);
}
