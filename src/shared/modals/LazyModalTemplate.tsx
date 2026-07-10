import Loading from '@/app/components/Loading';
import { ReactNode, Suspense } from 'react';

export default function LazyModalTemplate({
  children
}: {
  readonly children?: ReactNode;
}) {
  return <Suspense fallback={<Loading top="50%" />}>{children}</Suspense>;
}
