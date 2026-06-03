import { useEffect, useCallback } from 'react';
import { syncPending } from '../services/db.service';

export default function useOnlineSync() {
  const handleOnline = useCallback(async () => {
    console.log('🔌 Online — syncing pending actions...');
    await syncPending();
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    // Also sync when component mounts (user could be online already)
    if (navigator.onLine) {
      handleOnline();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, [handleOnline]);
}
