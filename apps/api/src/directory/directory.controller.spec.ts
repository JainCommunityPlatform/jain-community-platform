import { DirectoryController } from './directory.controller';

describe('DirectoryController', () => {
  it('returns the central public temple directory', async () => {
    const firestore = {
      listPublicTenants: jest.fn().mockResolvedValue([
        { id: 't1', name: 'Temple One', slug: 'temple-one' },
      ]),
    };
    const controller = new DirectoryController(firestore as never);

    await expect(controller.listTemples()).resolves.toEqual([
      { id: 't1', name: 'Temple One', slug: 'temple-one' },
    ]);
  });
});
