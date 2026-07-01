import { StoreQueryDefinition } from '@/core/db/queries-helper';
import { StoreTables } from '@/core/db/store-constants';
import { appLog } from '@/core/infra/log';
import { AppLogLevel, AppLogResult } from '@/core/infra/log-model';
import { ParamValues } from 'tinybase/with-schemas';

const fetchLogsQuery = new StoreQueryDefinition<
  ParamValues,
  AppLogResult,
  StoreTables.Logs
>(
  'fetchLogs',
  StoreTables.Logs,
  ({ select }) => {
    select('ts');
    select('level');
    select('message');
    select(getCell => {
      const level = getCell('level') as AppLogLevel;
      return appLog.getLongName(level);
    }).as('longLevelName');
  },
  'ts',
  false
);

export default fetchLogsQuery;
