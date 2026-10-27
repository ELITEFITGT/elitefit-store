import { useEffect } from 'react';
import { storeConfig } from '../config/store';

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${storeConfig.name}` : storeConfig.name;
  }, [title]);
}
