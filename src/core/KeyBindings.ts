export type ControlAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'attack'
  | 'dodge'
  | 'sprint'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'skill4'
  | 'interact'
  | 'action'
  | 'inventoryPanel'
  | 'journalPanel'
  | 'worldMapPanel'
  | 'craftPanel'
  | 'upgradePanel'
  | 'vault'
  | 'pause';

export type KeyBindings = Record<ControlAction, string[]>;

export interface ControlBindingDef {
  id: ControlAction;
  label: string;
  group: 'Movement' | 'Combat' | 'Actions' | 'Menus';
}

export const CONTROL_BINDING_DEFS: ControlBindingDef[] = [
  { id: 'moveForward', label: 'Move Forward', group: 'Movement' },
  { id: 'moveBackward', label: 'Move Backward', group: 'Movement' },
  { id: 'moveLeft', label: 'Move Left', group: 'Movement' },
  { id: 'moveRight', label: 'Move Right', group: 'Movement' },
  { id: 'attack', label: 'Attack', group: 'Combat' },
  { id: 'dodge', label: 'Dodge', group: 'Combat' },
  { id: 'sprint', label: 'Sprint', group: 'Combat' },
  { id: 'skill1', label: 'Skill 1', group: 'Combat' },
  { id: 'skill2', label: 'Skill 2', group: 'Combat' },
  { id: 'skill3', label: 'Skill 3', group: 'Combat' },
  { id: 'skill4', label: 'Skill 4', group: 'Combat' },
  { id: 'interact', label: 'Interact', group: 'Actions' },
  { id: 'action', label: 'Gather / Mine / Fish', group: 'Actions' },
  { id: 'vault', label: 'Vault Leap', group: 'Actions' },
  { id: 'inventoryPanel', label: 'Inventory', group: 'Menus' },
  { id: 'journalPanel', label: 'Journal', group: 'Menus' },
  { id: 'worldMapPanel', label: 'World Map', group: 'Menus' },
  { id: 'craftPanel', label: 'Life & Crafting', group: 'Menus' },
  { id: 'upgradePanel', label: 'Upgrades', group: 'Menus' },
  { id: 'pause', label: 'Pause', group: 'Menus' },
];

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveForward: ['KeyW', 'ArrowUp'],
  moveBackward: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  attack: ['Mouse0', 'KeyJ'],
  dodge: ['Space', 'KeyK'],
  sprint: ['ShiftLeft'],
  skill1: ['Digit1'],
  skill2: ['Digit2'],
  skill3: ['Digit3'],
  skill4: ['Digit4'],
  interact: ['KeyE'],
  action: ['KeyF'],
  inventoryPanel: ['KeyI'],
  journalPanel: ['KeyQ'],
  worldMapPanel: ['KeyM'],
  craftPanel: ['KeyC'],
  upgradePanel: ['KeyU'],
  vault: ['KeyV'],
  pause: ['Escape'],
};

export function cloneDefaultKeyBindings(): KeyBindings {
  return normalizeKeyBindings(DEFAULT_KEY_BINDINGS);
}

export function normalizeKeyBindings(raw?: Partial<Record<string, string[]>>): KeyBindings {
  const normalized = {} as KeyBindings;
  for (const def of CONTROL_BINDING_DEFS) {
    const keys = raw?.[def.id];
    normalized[def.id] = Array.isArray(keys) && keys.length
      ? [...new Set(keys.filter(Boolean))]
      : [...DEFAULT_KEY_BINDINGS[def.id]];
  }
  return normalized;
}

export function formatKeyCode(code: string): string {
  const labels: Record<string, string> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Space: 'Space',
    ShiftLeft: 'Left Shift',
    ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl',
    ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt',
    AltRight: 'Right Alt',
    Escape: 'Esc',
    Mouse0: 'Mouse Left',
  };
  if (labels[code]) return labels[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code.replace(/([a-z])([A-Z])/g, '$1 $2');
}
