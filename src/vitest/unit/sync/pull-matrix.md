- [ ] [item added]
- [x] Pull: item added locally, unchanged on remote → local add persists
- [x] Pull: item inexistent locally, added on remote → remote item pulled
- [ ] Pull: item added locally, added on remote with different content → ? (need to define: local add state or remote wins? Or conflict?)

- [ ] [item deleted locally first]
- [ ] Pull: item deleted locally, unchanged on remote → remote item re-pulled (remote wins)
- [ ] Pull: item deleted locally, then deleted on remote → both win, item gone
- [ ] Pull: item deleted locally, then updated on remote (any field) → remote wins, item exists with remote state

- [ ] [item deleted locally second]
- [ ] Pull: item updated on remote (any field), then deleted locally

- [ ] [item deleted remotely first]
- [ ] Pull: item deleted on remote, then deleted locally
- [ ] Pull: item deleted on remote, then updated locally on CONFLICTING field
- [ ] Pull: item deleted on remote, then updated locally on NON-CONFLICTING field
- [ ] Pull: item unchanged locally, deleted on remote → local deletion ignored, item deleted (remote wins)

- [ ] [item deleted remotely second]
- [ ] Pull: item updated locally (any field), then deleted on remote → local change lost, item deleted (remote wins)

- [ ] [item updated - non parent field - locally first]
- [ ] Pull: field updated locally on any field, unchanged on remote → local change persists
- [ ] Pull: same field (NON-CONFLICTING) updated locally, then remotely with different values
- [ ] Pull: same field (CONFLICTING) updated locally, then remotely with different values

- [ ] [item updated - non parent field - remotely first]
- [ ] Pull: field unchanged locally, updated on remote on any field → remote value applied
- [ ] Pull: same field (NON-CONFLICTING) updated remotely, then locally with different values
- [ ] Pull: same field (CONFLICTING) updated remotely, then locally with different values

- [ ] [item updated - non parent field - multiple]
- [ ] Pull: different fields updated locally and remotely → both changes persisted
- [ ] Pull: different fields updated remotely and locally → both changes persisted
- [ ] Pull: multiple fields updated locally (one conflicting, one non-conflicting), same fields updated remotely → ?

- [ ] [item without children moved - parent field - locally first]
- [ ] Pull: item moved locally, unchanged on remote → local move persists
- [ ] Pull: item moved locally, then moved to same parent on remote
- [ ] Pull: item moved locally to A, then moved remotely to B → conflict
- [ ] Pull: item moved locally to A, then A deleted remotely → item follows parent deletion (moved to notebook or deleted)
- [ ] Pull: item moved locally to A, B deleted locally, then item moved remotely to B → conflict
- [ ] Pull: item moved locally to A, then item moved remotely to B, then B deleted locally

- [ ] [item without children moved - parent field - locally second]
- [ ] Pull: A deleted remotely, then item moved locally to A
- [ ] Pull: A deleted remotely, then item moved remotely to B, then item moved locally to A

- [ ] [item without children moved - parent field - remotely first]
- [ ] Pull: item unchanged locally, moved on remote → remote move applied
- [ ] Pull: item moved remotely, then moved to same parent locally
- [ ] Pull: item moved remotely to A, then moved locally to B
- [ ] Pull: item moved remotely to A, then A deleted locally
- [ ] Pull: item moved remotely to A, B deleted remotely, then item moved locally to B
- [ ] Pull: item moved remotely to A, then item moved locally to B, then B deleted remotely

- [ ] [item without children moved - parent field - remotely second]
- [ ] Pull: A deleted locally, then item moved remotely to A
- [ ] Pull: A deleted locally, then item moved locally to B, then item moved remotely to A

- [ ] [folder/notebook with children moved] (TODO)

- [ ] Pull: node moved locally, node+children unchanged on remote → local move persists, children stay with node
- [ ] Pull: node+children unchanged locally, node moved on remote → remote move applied, children follow
- [ ] Pull: node moved locally to A, child also updated on remote (different field) → node in local parent, child has remote update
- [ ] Pull: node moved remotely to A, child updated locally (different field) → node in remote parent, child has local update
- [ ] Pull: node moved locally to A, then parent A deleted remotely → node+children follows A to notebook/deletion

- [ ] [document with pages moved] (TODO) (keep separate for versioning)
- [ ] Pull: node moved locally, node+children unchanged on remote → local move persists, children stay with node
- [ ] Pull: node+children unchanged locally, node moved on remote → remote move applied, children follow
- [ ] Pull: node moved locally to A, child also updated on remote (different field) → node in local parent, child has remote update
- [ ] Pull: node moved remotely to A, child updated locally (different field) → node in remote parent, child has local update
- [ ] Pull: node moved locally to A, then parent A deleted remotely → node+children follows A to notebook/deletion

- [ ] single pull, with max one change per item
- [ ] single pull, with >1 change per item (historizable, conflictable, or normal, + combo)

- [ ] TODO generate that dynamically with script from sync-pull matrix! when implemented
