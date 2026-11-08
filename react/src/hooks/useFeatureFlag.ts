import { useAccessControl } from '../context/AccessControlProvider.js';

export function useFeatureFlag(flag: string): boolean {
  const { permissions } = useAccessControl();
  if (!permissions) {
    return false;
  }
  return permissions.flags.includes(flag);
}
