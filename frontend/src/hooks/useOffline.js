import { useContext } from 'react';
import { OfflineContext } from '../context/OfflineContext';

export default function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider.');
  }
  return context;
}
