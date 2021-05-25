const fs = require('fs');
const path = require('path');
const process = require('process');

const MongoManager = require('../lib/mongo-manager');
const MongoMigrator = require('../lib/mongo-migrator');

describe('mongo-migrator.js', () => {
  describe('MongoMigrator', () => {
    const migrationDir = path.join(__dirname, 'migrations');
    const migrationEmptyDir = path.join(__dirname, 'migrations-empty');
    const migrationDuplicatedVersionErrorDir = path.join(__dirname, 'migrations-duplicated-version-error');
    const migrationInvalidFilenameErrorDir = path.join(__dirname, 'migrations-invalid-filename-error');

    let manager = null;
    let migrator = null;
    let spyConsoleLog = null;

    beforeEach(async () => {
      manager = new MongoManager({
        url: process.env.MONGODB_URL,
        database: process.env.MONGODB_DB,
        collections: {
          UserCollection: 'user',
          PostCollection: 'post',
          MigrationCollection: 'migration',
        },
      });

      await manager.connect();
      await manager.UserCollection.deleteMany();
      await manager.PostCollection.deleteMany();

      try {
        await manager.MigrationCollection.drop();
      }
      // eslint-disable-next-line no-empty
      catch (error) {}

      migrator = new MongoMigrator({
        manager,
        migrationCollectionAlias: 'MigrationCollection',
        migrationDirectory: migrationDir,
      });

      spyConsoleLog = jest.spyOn(global.console, 'log');
    });

    afterEach(async () => {
      if (manager) {
        await manager.close();
      }

      if (spyConsoleLog) {
        spyConsoleLog.mockRestore();
      }
    });

    describe('createNewMigrationFile()', () => {
      test('should error when duplicated migration version', async () => {
        migrator = new MongoMigrator({
          manager,
          migrationCollectionAlias: 'MigrationCollection',
          migrationDirectory: migrationDuplicatedVersionErrorDir,
        });

        expect(fs.readdirSync(migrationDuplicatedVersionErrorDir)).toHaveLength(2);

        await expect(migrator.createNewMigrationFile('any-name'))
          .rejects.toThrow('Duplicated migration version 1');

        expect(fs.readdirSync(migrationDuplicatedVersionErrorDir)).toHaveLength(2);

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should error when invalid migration filename', async () => {
        migrator = new MongoMigrator({
          manager,
          migrationCollectionAlias: 'MigrationCollection',
          migrationDirectory: migrationInvalidFilenameErrorDir,
        });

        expect(fs.readdirSync(migrationInvalidFilenameErrorDir)).toHaveLength(1);

        await expect(migrator.createNewMigrationFile('any-name'))
          .rejects.toThrow('Invalid migration filename normal-file.js');

        expect(fs.readdirSync(migrationInvalidFilenameErrorDir)).toHaveLength(1);

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should error when invalid description name', async () => {
        expect(fs.readdirSync(migrationDir)).toHaveLength(3);

        await expect(migrator.createNewMigrationFile('Any_Name'))
          .rejects.toThrow('Invalid migration filename description Any_Name');

        expect(fs.readdirSync(migrationDir)).toHaveLength(3);

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should success when migration dir is empty', async () => {
        migrator = new MongoMigrator({
          manager,
          migrationCollectionAlias: 'MigrationCollection',
          migrationDirectory: migrationEmptyDir,
        });

        expect(fs.readdirSync(migrationEmptyDir)).toHaveLength(0);

        await migrator.createNewMigrationFile('any-name');

        expect(fs.readdirSync(migrationEmptyDir)).toEqual(['1.any-name.js']);
        fs.unlinkSync(path.join(migrationEmptyDir, '1.any-name.js'));

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should success when does not apply any migrations', async () => {
        expect(fs.readdirSync(migrationDir)).toHaveLength(3);

        await migrator.createNewMigrationFile('any-name');

        const files = fs.readdirSync(migrationDir);
        expect(files).toHaveLength(4);
        expect(files).toContain('16.any-name.js');

        const fileContent = fs.readFileSync(path.join(migrationDir, '16.any-name.js'), 'utf8');
        expect(fileContent).toEqual('module.exports = async (manager, session) => {};\n');

        fs.unlinkSync(path.join(migrationDir, '16.any-name.js'));

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should success when does apply some migrations', async () => {
        expect(fs.readdirSync(migrationDir)).toHaveLength(3);

        await migrator.MigrationCollection.insertOne({
          version: 1,
          filename: '1.create-db.js',
          appliedTime: new Date(),
        });

        await migrator.createNewMigrationFile('any-name');

        const files = fs.readdirSync(migrationDir);
        expect(files).toHaveLength(4);
        expect(files).toContain('16.any-name.js');

        const fileContent = fs.readFileSync(path.join(migrationDir, '16.any-name.js'), 'utf8');
        expect(fileContent).toEqual('module.exports = async (manager, session) => {};\n');

        fs.unlinkSync(path.join(migrationDir, '16.any-name.js'));

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(1);
      });
    });

    describe('status()', () => {
      test('should error when duplicated migration version', async () => {
        migrator = new MongoMigrator({
          manager,
          migrationCollectionAlias: 'MigrationCollection',
          migrationDirectory: migrationDuplicatedVersionErrorDir,
        });

        await expect(migrator.status()).rejects.toThrow('Duplicated migration version 1');

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should error when invalid migration filename', async () => {
        migrator = new MongoMigrator({
          manager,
          migrationCollectionAlias: 'MigrationCollection',
          migrationDirectory: migrationInvalidFilenameErrorDir,
        });

        await expect(migrator.status()).rejects.toThrow('Invalid migration filename normal-file.js');

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should success when migration dir is empty', async () => {
        migrator = new MongoMigrator({
          manager,
          migrationCollectionAlias: 'MigrationCollection',
          migrationDirectory: migrationEmptyDir,
        });

        await migrator.status();
        expect(spyConsoleLog.mock.calls[0][0]).toContain('There are no migration files');

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should success when does not apply any migrations', async () => {
        await migrator.status();
        expect(spyConsoleLog.mock.calls[0][0]).toContain('1.create-db.js: -');
        expect(spyConsoleLog.mock.calls[1][0]).toContain('2.update-something-in-db.js: -');
        expect(spyConsoleLog.mock.calls[2][0]).toContain('15.mix-db.js: -');

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should success when does apply some migrations', async () => {
        await migrator.MigrationCollection.insertOne({
          version: 1,
          filename: '1.create-db.js',
          appliedTime: new Date(),
        });

        await migrator.status();
        expect(spyConsoleLog.mock.calls[0][0]).toContain('1.create-db.js: applied at');
        expect(spyConsoleLog.mock.calls[1][0]).toContain('2.update-something-in-db.js: -');
        expect(spyConsoleLog.mock.calls[2][0]).toContain('15.mix-db.js: -');

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(1);
      });
    });

    describe('migrate()', () => {
      test('should error when duplicated migration version', async () => {
        migrator = new MongoMigrator({
          manager,
          migrationCollectionAlias: 'MigrationCollection',
          migrationDirectory: migrationDuplicatedVersionErrorDir,
        });

        await expect(migrator.migrate()).rejects.toThrow('Duplicated migration version 1');

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should error when invalid migration filename', async () => {
        migrator = new MongoMigrator({
          manager,
          migrationCollectionAlias: 'MigrationCollection',
          migrationDirectory: migrationInvalidFilenameErrorDir,
        });

        await expect(migrator.migrate()).rejects.toThrow('Invalid migration filename normal-file.js');

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should success when migration dir is empty', async () => {
        migrator = new MongoMigrator({
          manager,
          migrationCollectionAlias: 'MigrationCollection',
          migrationDirectory: migrationEmptyDir,
        });

        await migrator.migrate();
        expect(spyConsoleLog.mock.calls[0][0]).toContain('There are no migration files');

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(0);
      });

      test('should success when does not apply any migrations', async () => {
        const beforeDate = new Date(Date.now() - 1);

        let users = await manager.UserCollection.find().toArray();
        expect(users).toHaveLength(0);

        await migrator.migrate();

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(3);

        expect(items[0].version).toEqual(1);
        expect(items[0].filename).toEqual('1.create-db.js');
        expect(items[0].appliedTime).toBeInstanceOf(Date);
        expect(items[0].appliedTime.getTime()).toBeGreaterThan(beforeDate.getTime());

        expect(items[1].version).toEqual(2);
        expect(items[1].filename).toEqual('2.update-something-in-db.js');
        expect(items[1].appliedTime).toBeInstanceOf(Date);
        expect(items[1].appliedTime.getTime()).toBeGreaterThan(beforeDate.getTime());

        expect(items[2].version).toEqual(15);
        expect(items[2].filename).toEqual('15.mix-db.js');
        expect(items[2].appliedTime).toBeInstanceOf(Date);
        expect(items[2].appliedTime.getTime()).toBeGreaterThan(beforeDate.getTime());

        expect(items[1].appliedTime.getTime()).toBeGreaterThan(items[0].appliedTime.getTime());
        expect(items[2].appliedTime.getTime()).toBeGreaterThan(items[1].appliedTime.getTime());

        users = await manager.UserCollection.find().toArray();
        expect(users).toHaveLength(2);

        expect(users[0].username).toEqual('the-one');
        expect(users[1].username).toEqual('the-final');
      });

      test('should success when does apply some migrations', async () => {
        const beforeDate = new Date(Date.now() - 1);

        await migrator.MigrationCollection.insertOne({
          version: 1,
          filename: '1.create-db.js',
          appliedTime: beforeDate,
        });

        let users = await manager.UserCollection.find().toArray();
        expect(users).toHaveLength(0);

        await migrator.migrate();

        const items = await migrator.MigrationCollection.find().toArray();
        expect(items).toHaveLength(3);

        expect(items[0].version).toEqual(1);
        expect(items[0].filename).toEqual('1.create-db.js');
        expect(items[0].appliedTime).toBeInstanceOf(Date);
        expect(items[0].appliedTime.getTime()).toEqual(beforeDate.getTime());

        expect(items[1].version).toEqual(2);
        expect(items[1].filename).toEqual('2.update-something-in-db.js');
        expect(items[1].appliedTime).toBeInstanceOf(Date);
        expect(items[1].appliedTime.getTime()).toBeGreaterThan(beforeDate.getTime());

        expect(items[2].version).toEqual(15);
        expect(items[2].filename).toEqual('15.mix-db.js');
        expect(items[2].appliedTime).toBeInstanceOf(Date);
        expect(items[2].appliedTime.getTime()).toBeGreaterThan(beforeDate.getTime());

        expect(items[1].appliedTime.getTime()).toBeGreaterThan(items[0].appliedTime.getTime());
        expect(items[2].appliedTime.getTime()).toBeGreaterThan(items[1].appliedTime.getTime());

        users = await manager.UserCollection.find().toArray();
        expect(users).toHaveLength(1);

        expect(users[0].username).toEqual('the-final');
      });
    });
  });
});
