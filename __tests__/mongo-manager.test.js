const process = require('process');

const MongoManager = require('../lib/mongo-manager');

describe('mongo-manager.js', () => {
  describe('MongoManager', () => {
    let manager = null;

    beforeEach(() => {
      manager = new MongoManager({
        url: process.env.MONGODB_URL,
        database: process.env.MONGODB_DB,
        collections: {
          UserCollection: 'user',
        },
      });
    });

    afterEach(async () => {
      if (manager) {
        await manager.close();
      }
    });

    describe('connect()', () => {
      test('should success', async () => {
        expect(manager.client.isConnected()).toEqual(false);
        expect(manager.db).toBeNull();
        expect(manager.UserCollection).toBeUndefined();

        await manager.connect();
        expect(manager.client.isConnected()).toEqual(true);
        expect(manager.db).toBeTruthy();
        expect(manager.db).toHaveProperty('createCollection');
        expect(manager.UserCollection).toBeTruthy();
        expect(manager.UserCollection).toHaveProperty('find');

        await manager.UserCollection.deleteMany();
        await manager.UserCollection.insertOne({ username: 'trubavuong' });

        const users = await manager.UserCollection.find().toArray();
        expect(users).toHaveLength(1);
        expect(users[0].username).toEqual('trubavuong');

        expect(manager.client.isConnected()).toEqual(true);
      });
    });

    describe('close()', () => {
      test('should success', async () => {
        expect(manager.client.isConnected()).toEqual(false);
        expect(manager.db).toBeNull();
        expect(manager.UserCollection).toBeUndefined();

        await manager.connect();
        expect(manager.client.isConnected()).toEqual(true);
        expect(manager.db).toBeTruthy();
        expect(manager.UserCollection).toBeTruthy();

        await manager.close();
        expect(manager.client.isConnected()).toEqual(false);
        expect(manager.db).toBeNull();
        expect(manager.UserCollection).toBeUndefined();
      });
    });
  });
});
