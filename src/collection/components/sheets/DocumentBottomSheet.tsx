import Loading from '@/app/components/Loading';
import BottomSheet from '@/shared/containers/BottomSheet';
import { lazy, Suspense } from 'react';

export type DocSheet = 'info' | 'notes' | 'stats';

type DocumentBottomSheetProps = {
  id: string;
  select: DocSheet;
  className?: string;
  onCloseSelf?: () => void;
};

const ChartContainer = lazy(() =>
  import('@/features/stats-ui').then(m => ({
    default: m.ChartContainer
  }))
);
const NotesBrowser = lazy(() =>
  import('@/features/notes-ui').then(m => ({
    default: m.NotesBrowser
  }))
);

const DocumentBottomSheetSwitcher = ({
  id,
  select
}: DocumentBottomSheetProps) => {
  const DocumentGeneralInfo = lazy(() => import('./DocumentGeneralInfo'));
  switch (select) {
    case 'info':
    default:
      return (
        <Suspense fallback={<Loading />}>
          <DocumentGeneralInfo id={id} />
        </Suspense>
      );
    case 'stats':
      return (
        <Suspense fallback={<Loading />}>
          <ChartContainer id={id} />
        </Suspense>
      );
    case 'notes':
      return (
        <Suspense fallback={<Loading />}>
          <NotesBrowser id={id} />
        </Suspense>
      );
  }
};

const DocumentBottomSheet = ({
  id,
  select = 'info',
  className,
  onCloseSelf
}: DocumentBottomSheetProps) => {
  return (
    <BottomSheet onCloseSelf={onCloseSelf} classNames={className}>
      <DocumentBottomSheetSwitcher id={id} select={select} />
    </BottomSheet>
  );
};

export default DocumentBottomSheet;
