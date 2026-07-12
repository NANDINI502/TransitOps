export const ROLES = {
  ADMIN: 'admin',
  FLEET_MANAGER: 'fleet_manager',
  DISPATCHER: 'dispatcher',
  SAFETY_OFFICER: 'safety_officer',
  FINANCIAL_ANALYST: 'financial_analyst',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.FLEET_MANAGER]: 'Fleet Manager',
  [ROLES.DISPATCHER]: 'Dispatcher',
  [ROLES.SAFETY_OFFICER]: 'Safety Officer',
  [ROLES.FINANCIAL_ANALYST]: 'Financial Analyst',
};

export const ACCESS_MATRIX = {
  [ROLES.ADMIN]: { fleet: 'full', drivers: 'full', trips: 'full', fuelExp: 'full', analytics: 'full' },
  [ROLES.FLEET_MANAGER]: { fleet: 'full', drivers: 'full', trips: 'view', fuelExp: 'view', analytics: 'view' },
  [ROLES.DISPATCHER]: { fleet: 'view', drivers: 'view', trips: 'full', fuelExp: 'none', analytics: 'none' },
  [ROLES.SAFETY_OFFICER]: { fleet: 'view', drivers: 'full', trips: 'view', fuelExp: 'none', analytics: 'view' },
  [ROLES.FINANCIAL_ANALYST]: { fleet: 'view', drivers: 'none', trips: 'view', fuelExp: 'full', analytics: 'full' },
};

export function getAccess(role, module) {
  return ACCESS_MATRIX[role]?.[module] ?? 'none';
}

export function canEdit(role, module) {
  return getAccess(role, module) === 'full';
}

export function canView(role, module) {
  const access = getAccess(role, module);
  return access === 'full' || access === 'view';
}
