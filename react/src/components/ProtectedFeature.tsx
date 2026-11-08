import type { ReactNode } from 'react';
import { useFeatureFlag } from '../hooks/useFeatureFlag.js';

export function ProtectedFeature({
  flag,
  children,
  fallback = null,
}: {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const granted = useFeatureFlag(flag);
  if (!granted) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
