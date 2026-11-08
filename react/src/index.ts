export const REACT_PACKAGE = 'gateflag' as const;

export type { AccessControlConfig, AccessControlState, PermissionsResponse } from './types.js';
export { PermissionsClient } from './api/PermissionsClient.js';
export { AdminClient } from './api/AdminClient.js';
export { ApiError } from './api/http.js';
export {
  AccessControlProvider,
  useAccessControl,
} from './context/AccessControlProvider.js';
export { usePermissions } from './hooks/usePermissions.js';
export { useFeatureFlag } from './hooks/useFeatureFlag.js';
export { ProtectedFeature } from './components/ProtectedFeature.js';
export { AccessButton, useAdminCloseHandler } from './components/AccessButton.js';
export { AccessControlErrorBoundary } from './components/AccessControlErrorBoundary.js';
export { AdminModal } from './admin/AdminModal.js';
export { parseEmailChips } from './admin/emailChips.js';
