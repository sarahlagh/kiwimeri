import Loading from '@/app/components/Loading';
import BottomSheet from '@/shared/containers/BottomSheet';
import { lazy, Suspense } from 'react';

export type DocSheet = 'info' | 'comments' | 'stats';

type DocumentBottomSheetProps = {
  id: string;
  select: DocSheet;
};

const DocumentBottomSheetSwitcher = ({
  id,
  select
}: DocumentBottomSheetProps) => {
  const DocumentGeneralInfo = lazy(() => import('./DocumentGeneralInfo'));
  const ChartContainer = lazy(
    () => import('@/features/stats-ui/components/ChartContainer')
  );
  const CommentsBrowser = lazy(
    () => import('@/features/comments-ui/components/CommentsBrowser')
  );

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
    case 'comments':
      return (
        <Suspense fallback={<Loading />}>
          <CommentsBrowser id={id} />
        </Suspense>
      );
  }
};

const DocumentBottomSheet = ({
  id,
  select = 'info'
}: DocumentBottomSheetProps) => {
  return (
    <BottomSheet>
      <DocumentBottomSheetSwitcher id={id} select={select} />
    </BottomSheet>
  );
};

export default DocumentBottomSheet;
