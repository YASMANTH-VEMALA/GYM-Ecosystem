export const PortalSectionValues = [
  'dashboard',
  'members',
  'fees',
  'checkins',
  'qr_codes',
  'payments',
  'plans',
  'workouts',
  'diets',
  'analytics',
  'notifications',
] as const;

export type PortalSection = (typeof PortalSectionValues)[number];

export const DefaultManagerPortalSections: PortalSection[] = [
  'dashboard',
  'members',
  'fees',
  'checkins',
  'qr_codes',
  'payments',
  'workouts',
  'diets',
  'analytics',
  'notifications',
];

export function isPortalSection(value: string): value is PortalSection {
  return (PortalSectionValues as readonly string[]).includes(value);
}
