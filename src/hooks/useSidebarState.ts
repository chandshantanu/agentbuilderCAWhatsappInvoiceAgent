import { useState, useCallback } from 'react';

const STORAGE_KEY = 'dashboard-sidebar-collapsed';

function readStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(readStorage);

  const setCollapsed = useCallback((value: boolean) => {
    setIsCollapsed(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // storage unavailable
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!isCollapsed);
  }, [isCollapsed, setCollapsed]);

  return { isCollapsed, toggle, setCollapsed } as const;
}
