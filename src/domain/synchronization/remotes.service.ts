import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { AnyData } from '@/core/db/types';
import { Remote } from './remotes';
import replicaService from './replica.service';

const R = SpaceTables.Remote;

class RemotesService {
  public addRemote(
    name: string,
    rank: number,
    driver: string,
    config: AnyData = {}
  ) {
    space.addRow(
      R,
      {
        rank,
        name,
        driver,
        config
      },
      false
    );
  }

  public async delRemote(remoteId: string) {
    space.transaction(() => {
      // update ranks
      const remaining = this.getRemotes().filter(r => r.id !== remoteId);
      for (let i = 0; i < remaining.length; i++) {
        space.setCell(R, remaining[i].id, 'rank', i);
      }
      // delete the row
      space.delRow(R, remoteId);
      replicaService.destroy(remoteId);
    });
  }

  public setRemoteName(remote: string, name: string) {
    space.setCell(R, remote, 'name', name);
  }

  public setRemoteConfig(remote: string, config: AnyData) {
    space.setCell(R, remote, 'config', config);
  }

  public updateRemoteRank(currentRank: number, newRank: number) {
    space.transaction(() => {
      const remotes = this.getRemotes();
      if (currentRank < newRank) {
        for (let i = currentRank + 1; i < newRank + 1; i++) {
          space.setCell(R, remotes[i].id, 'rank', i - 1);
        }
      } else {
        for (let i = newRank; i < currentRank; i++) {
          space.setCell(R, remotes[i].id, 'rank', i + 1);
        }
      }
      space.setCell(R, remotes[currentRank].id, 'rank', newRank);
    });
  }

  public getRemotes(): Remote[] {
    const table = space.getTable(R);
    return space
      .getSortedRowIds(R, 'rank')
      .map(rowId => ({ ...(table[rowId] as Remote), id: rowId }));
  }
}

const remotesService = new RemotesService();
export default remotesService;
