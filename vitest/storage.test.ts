describe('first test, getting a feel', () => {
  it('should test something', () => {
    const ob = {};
    expect(ob).toBeDefined();

    // setup: create inmem storage provider
    // setup: create remote config
    // test: first pull, remote has nothing
    // test: first pull, remote has content
    // test: first push, remote has nothing
    // test: first push, remote has content
    // test: second pull, no local changes, remote hasn't changed
    // test: second pull, no local changes, remote has changed
    // test: second pull, with local changes, remote hasn't changed
    // test: second pull, with local changes, remote has changed
    // test: no local changes, push is disabled
    // test: local changes, push is enable
    // test: local changes, push, remote hasn't changed
    // test: local changes, push, remote has changed
  });
});
