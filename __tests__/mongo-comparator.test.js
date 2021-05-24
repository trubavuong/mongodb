const process = require('process');

const MongoManager = require('../lib/mongo-manager');
const MongoComparator = require('../lib/mongo-comparator');

describe('mongo-comparator.js', () => {
  describe('MongoComparator', () => {
    let manager = null;

    beforeEach(async () => {
      manager = new MongoManager({
        url: process.env.MONGODB_URL,
        database: process.env.MONGODB_DB,
        collections: {
          UserCollection: 'user',
          PostCollection: 'post',
        },
      });

      await manager.connect();
      await manager.UserCollection.deleteMany();
      await manager.PostCollection.deleteMany();
    });

    afterEach(async () => {
      if (manager) {
        await manager.close();
      }
    });

    describe('compareCollectionsAfterAction()', () => {
      test('should success when action do nothing and collections are empty', async () => {
        const { same, differ } = await MongoComparator.compareCollectionsAfterAction({
          collections: [
            manager.UserCollection,
            manager.PostCollection,
          ],
          action: () => {},
        });

        expect(same).toEqual([
          manager.UserCollection,
          manager.PostCollection,
        ]);

        expect(differ).toEqual([]);
      });

      test('should success when action do nothing and collections are not empty', async () => {
        await manager.UserCollection.insertMany([
          { username: 'trubavuong' },
          { username: 'vuongtru' },
        ]);

        await manager.PostCollection.insertMany([
          { username: 'trubavuong', content: 'Hello World' },
          { username: 'trubavuong', content: 'Bye' },
          { username: 'vuongtru', content: 'Hi Kitty' },
        ]);

        const { same, differ } = await MongoComparator.compareCollectionsAfterAction({
          collections: [
            manager.UserCollection,
            manager.PostCollection,
          ],
          action: () => {},
        });

        expect(same).toEqual([
          manager.UserCollection,
          manager.PostCollection,
        ]);

        expect(differ).toEqual([]);
      });

      test('should success when action do something in one collection', async () => {
        const { same, differ } = await MongoComparator.compareCollectionsAfterAction({
          collections: [
            manager.UserCollection,
            manager.PostCollection,
          ],
          action: async () => {
            await manager.UserCollection.insertOne({
              username: 'trubavuong',
            });
          },
        });

        expect(same).toEqual([
          manager.PostCollection,
        ]);

        expect(differ).toEqual([
          manager.UserCollection,
        ]);
      });

      test('should success when action do something in multiple collections', async () => {
        await manager.UserCollection.insertMany([
          { username: 'trubavuong' },
          { username: 'vuongtru' },
        ]);

        await manager.PostCollection.insertMany([
          { username: 'trubavuong', content: 'Hello World' },
          { username: 'trubavuong', content: 'Bye' },
          { username: 'vuongtru', content: 'Hi Kitty' },
        ]);

        const { same, differ } = await MongoComparator.compareCollectionsAfterAction({
          collections: [
            manager.UserCollection,
            manager.PostCollection,
          ],
          action: async () => {
            await manager.UserCollection.updateOne(
              { username: 'trubavuong' },
              { $set: { name: 'Vuong Tru' } },
            );

            await manager.PostCollection.updateOne(
              { content: 'Bye' },
              { $set: { content: 'See you soon' } },
            );
          },
        });

        expect(same).toEqual([]);

        expect(differ).toEqual([
          manager.UserCollection,
          manager.PostCollection,
        ]);
      });
    });
  });
});
