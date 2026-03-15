- [x] [item added]
- [x] Pull: item added locally, unchanged on remote → local add persists
- [x] Pull: item inexistent locally, added on remote → remote item pulled
- [x] Pull: item added locally, added on remote with different content → ? local values win but meta fields don't ?

- [x] [item deleted locally first]
- [x] Pull: item deleted locally, unchanged on remote → item stays deleted (local wins)
- [x] Pull: item deleted locally, then deleted on remote → both win, item gone
- [x] Pull: item deleted locally, then updated on remote (any field) → remote wins, item exists with remote state
- [x] Pull: item deleted locally, then moved on remote → remote wins, item exists with remote state

- [x] [item deleted locally second]
- [x] Pull: item updated on remote (any field), then deleted locally → item stays deleted (local wins)
- [x] Pull: item moved on remote, then deleted locally → item stays deleted (local wins)

- [x] [item deleted remotely first]
- [x] Pull: item deleted on remote, then deleted locally → both win, item gone
- [x] Pull: item deleted on remote, then updated locally on HISTORIZABLE field → local wins, item stays
- [x] Pull: item deleted on remote, then updated locally on order field → local wins, item stays
- [x] Pull: item deleted on remote, then moved locally → local wins, item stays
      ! found bug on this one, for page scenario, force pull
      moving on since this is a very unlikely scenario, but must be solved later when we enable move on page
      or, just forbid move on page (only allow copy)
      also add scenario when parent is not deleted
- [x] Pull: item unchanged locally, deleted on remote → item deleted (remote wins)

- [x] [item deleted remotely second]
- [x] Pull: item updated locally (CONFLICT field), then deleted on remote → local change lost, item deleted (remote wins)
- [x] Pull: item updated locally (NON-CONFLICT field), then deleted on remote → local change lost, item deleted (remote wins)
- [x] Pull: item updated locally (order field), then deleted on remote → local change lost, item deleted (remote wins)
- [x] Pull: item moved locally, then deleted on remote → local change lost, item deleted (remote wins)
      ! same bug as above

- [x] [item updated - non parent field - locally first]
- [x] Pull: field updated locally on any field, unchanged on remote → local change persists
- [x] Pull: same field on item updated locally, then remotely with same value → remote change persists
- [x] Pull: same field (NON-CONFLICTING) on item updated locally, then remotely with different value → remote change persists
- [x] Pull: same field (CONFLICTING) on item updated locally, then remotely with different value → conflict created

- [x] [item updated - non parent field - remotely first]
- [x] Pull: field unchanged locally, updated on remote on any field → remote value applied
- [x] Pull: same field on item updated remotely, then locally with same value → local change persists
- [x] Pull: same field (NON-CONFLICTING) on item updated remotely, then locally with different value → local change persists
- [x] Pull: same field (CONFLICTING) on item updated remotely, then locally with different value → local change persists

- [x] [item without children moved - parent field - locally first]
- [x] Pull: item moved locally, unchanged on remote → local move persists
- [x] Pull: item moved locally, then moved to same parent on remote → remote wins
- [x] Pull: item moved locally to A, then moved remotely to B → conflict
- [x] Pull: item moved locally to A, then A deleted remotely → orphaned conflict
- [x] Pull: item moved locally to A, B deleted locally, then item moved remotely to B → orphaned conflict
- [x] Pull: item moved locally to A, then item moved remotely to B, then B deleted locally → orphaned conflict

- [x] [item without children moved - parent field - remotely first]
- [x] Pull: item unchanged locally, moved on remote → remote move applied
- [x] Pull: item moved remotely, then moved to same parent locally → local wins
- [x] Pull: item moved remotely to A, then moved locally to B → local wins
- [x] Pull: item moved remotely to A, then A deleted locally → orphaned conflict
- [x] Pull: item moved remotely to A, B deleted remotely, then item moved locally to B → orphaned conflict
- [x] Pull: item moved remotely to A, then item moved locally to B, then B deleted remotely → orphaned conflict

- [x] [item without children moved - parent field - parent deleted remotely first]
- [x] Pull: A deleted remotely, then item moved locally to A → orphaned conflict
- [x] Pull: A deleted remotely, then item moved locally to A, then item moved remotely to B → remote wins
- [x] Pull: A deleted remotely, then item moved remotely to B, then item moved locally to A → orphaned conflict

- [x] [item without children moved - parent field - parent deleted locally first]
- [x] Pull: A deleted locally, then item moved remotely to A → orphaned conflict
- [x] Pull: A deleted locally, then item moved remotely to A, then item moved locally to B → local wins
- [x] Pull: A deleted locally, then item moved locally to B, then item moved remotely to A

<!-- - [ ] [folder/notebook with children moved]
- [ ] Pull: node moved locally, node+children unchanged on remote → local move persists, children stay with node
- [ ] Pull: node+children unchanged locally, node moved on remote → remote move applied, children follow
- [ ] Pull: node moved locally to A, child also updated on remote (different field) → node in local parent, child has remote update
- [ ] Pull: node moved remotely to A, child updated locally (different field) → node in remote parent, child has local update
- [ ] Pull: node moved locally to A, then parent A deleted remotely → node+children follows A to notebook/deletion -->

- [ ] [document with pages updated]
      what it means for versionning:
      j'ai le cas "page was updated", mais pas "page + doc" en même temps
      Pull: a doc was updated locally, its page was updated remotely
      Pull: a doc was updated remotely, its page page was updated locally
      Pull: a doc & its page were updated remotely, the page locally
      Pull: a doc & its page were updated remotely, the doc locally
      Pull: a doc & its page were updated remotely, and both locally on CONFLICTING fields
      Pull: a doc & its page were updated remotely, and both locally on NON-CONFLICTING fields
      ...(same field, different fields, page added or removed...)
      ...more than 1 page changed remotely or locally

- [ ] [document with pages moved]
- [x] Pull: document moved locally, document + pages unchanged on remote → local move persists, pages stay with document
- [x] Pull: document with pages unchanged locally, document moved on remote → remote move applied, pages follow
- [x] Pull: document moved locally, its page also updated on remote (different field) → doc in local parent, page has remote update
- [ ] Pull: document moved remotely, page updated locally (different field) → doc in remote parent, page has local update
- [ ] Pull: document moved remotely, page updated remotely (different field) → doc in remote parent, page has remote update
- [ ] Pull: node moved locally to A, then parent A deleted remotely → doc and pages follow A to notebook/deletion

- [ ] [item updated / moved - multiple]
- [ ] Pull: different fields updated locally and remotely → both changes persisted
- [ ] Pull: different fields updated remotely and locally → both changes persisted
- [ ] Pull: multiple fields updated locally (one conflicting, one non-conflicting), same fields updated remotely → ?
