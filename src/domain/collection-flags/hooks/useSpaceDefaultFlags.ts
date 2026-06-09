import usePref from '@/domain/user-preferences/hooks/usePref';
import { NotebookFlags } from '../model';

export default function useSpaceDefaultFlags(): Required<NotebookFlags> {
  const statsEnabled = usePref<'statsEnabled'>('statsEnabled');
  return {
    statsEnabled: statsEnabled
  };
}
