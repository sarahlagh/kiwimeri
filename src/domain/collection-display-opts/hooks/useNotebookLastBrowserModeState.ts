import { SID } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import notebooksService from '@/db/notebooks.service';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Id } from 'tinybase/with-schemas';
import { displayOptsService } from '../display-opts.service';
import { NotebookDisplayOpts } from '../model';

type LastBrowserMode = Required<NotebookDisplayOpts>['lastBrowserMode'];

export default function useNotebookLastBrowserModeState(
  notebook?: Id
): [LastBrowserMode, Dispatch<SetStateAction<LastBrowserMode>>] {
  if (!notebook) {
    notebook = notebooksService.getCurrentNotebook();
  }
  const cellValue = useSpaceCell<'collection', 'display_opts'>(
    'collection',
    notebook,
    'display_opts',
    SID.space
  ) as NotebookDisplayOpts | undefined;
  const [browserMode, setBrowserMode] = useState<LastBrowserMode>(
    cellValue?.lastBrowserMode || 0
  );
  useEffect(() => {
    displayOptsService.setNotebookDefaultBrowserMode(notebook, browserMode);
  }, [cellValue, browserMode]);
  return [browserMode, setBrowserMode];
}
