const fs = require('fs');
const path = require('path');

const getVersionInMigrationFilename = filename => {
  const matches = filename.match(/^(\d+)\./);
  if (!matches) {
    throw new Error(`Invalid migration filename ${filename}`);
  }

  const number = parseInt(matches[1], 10);
  return number;
};

const sortMigrationFilenamesByVersion = filenames => {
  const versionFilenames = filenames.map(filename => ([
    getVersionInMigrationFilename(filename),
    filename,
  ]));

  const versionSet = new Set();
  const versions = versionFilenames.map(([version]) => version);
  for (let i = 0; i < versions.length; i += 1) {
    const version = versions[i];
    if (versionSet.has(version)) {
      throw new Error(`Duplicated migration version ${version}`);
    }
    versionSet.add(version);
  }

  const sortedFilenamesByVersion = versionFilenames
    .sort(([versionA], [versionB]) => versionA - versionB)
    .map(([, filename]) => filename);

  return sortedFilenamesByVersion;
};

const loadSortedMigrationFiles = dir => {
  const migrationFilenames = fs.readdirSync(dir);
  const sortedMigrationFilenames = sortMigrationFilenamesByVersion(migrationFilenames);
  return sortedMigrationFilenames;
};

const timestampPrint = message => {
  global.console.log(`${new Date().toISOString()}: ${message}`);
};

class MongoMigrator {
  constructor({
    manager,
    migrationDirectory,
    migrationCollectionAlias,
  }) {
    this.manager = manager;
    this.migrationDirectory = migrationDirectory;
    this.MigrationCollection = manager[migrationCollectionAlias];

    try {
      fs.mkdirSync(migrationDirectory);
    }
    // eslint-disable-next-line no-empty
    catch (error) {}
  }

  async createNewMigrationFile(name) {
    if (!/^[a-z-]+$/.test(name)) {
      throw new Error(`Invalid migration filename description ${name}`);
    }

    const sortedMigrationFilenames = loadSortedMigrationFiles(this.migrationDirectory);
    const latestFilename = sortedMigrationFilenames[sortedMigrationFilenames.length - 1];
    const latestVersion = (latestFilename ? getVersionInMigrationFilename(latestFilename) : 0);
    const newVersion = latestVersion + 1;
    const newFilename = path.join(this.migrationDirectory, `${newVersion}.${name}.js`);
    fs.writeFileSync(newFilename, 'module.exports = async (manager, session) => {};\n', 'utf8');
  }

  async status() {
    const sortedMigrationFilenames = loadSortedMigrationFiles(this.migrationDirectory);
    if (sortedMigrationFilenames.length > 0) {
      for (let i = 0; i < sortedMigrationFilenames.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await this.$printMigrationFileStatus(sortedMigrationFilenames[i]);
      }
    }
    else {
      timestampPrint('There are no migration files');
    }
  }

  async migrate() {
    const sortedMigrationFilenames = loadSortedMigrationFiles(this.migrationDirectory);

    await this.$prepareMigrationCollection();

    await this.manager.client.withSession(async session => {
      await session.withTransaction(async () => {
        if (sortedMigrationFilenames.length > 0) {
          for (let i = 0; i < sortedMigrationFilenames.length; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            await this.$applyMigrationFile(sortedMigrationFilenames[i], session);
          }
        }
        else {
          timestampPrint('There are no migration files');
        }
      });
    });
  }

  async $createMigrationCollectionIndexes() {
    await this.MigrationCollection.createIndex(
      { filename: 1 },
      {
        unique: true,
        background: true,
      },
    );
    await this.MigrationCollection.createIndex(
      { version: 1 },
      {
        unique: true,
        background: true,
      },
    );
  }

  async $createMigrationCollectionSchemaValidator() {
    await this.manager.db.command(
      {
        collMod: this.MigrationCollection.collectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: [
              'version',
              'filename',
              'appliedTime',
            ],
            properties: {
              version: {
                bsonType: [
                  'int',
                  'long',
                ],
              },
              filename: {
                bsonType: 'string',
                pattern: '^\\d+\\.[a-z-]+\\.js$',
              },
              appliedTime: {
                bsonType: 'date',
              },
            },
          },
        },
      },
    );
  }

  async $prepareMigrationCollection() {
    await this.$createMigrationCollectionIndexes();
    await this.$createMigrationCollectionSchemaValidator();
  }

  async $printMigrationFileStatus(filename) {
    const doc = await this.MigrationCollection.findOne(
      { filename },
    );
    if (doc) {
      timestampPrint(`${filename}: applied at ${doc.appliedTime.toISOString()}`);
    }
    else {
      timestampPrint(`${filename}: -`);
    }
  }

  async $applyMigrationFile(filename, session) {
    const absoluteFilename = path.join(this.migrationDirectory, filename);
    const version = getVersionInMigrationFilename(filename);

    timestampPrint(filename);

    const doc = await this.MigrationCollection.findOne(
      { filename },
      { session },
    );
    if (doc) {
      timestampPrint(`  already applied at ${doc.appliedTime.toISOString()}`);
    }
    else {
      timestampPrint('  is being read ...');
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const fn = require(absoluteFilename);
      timestampPrint('    done');

      timestampPrint('  is being applied ...');
      await fn(this.manager, session);
      timestampPrint('    done');

      timestampPrint('  is being saved ...');
      await this.MigrationCollection.insertOne(
        {
          version,
          filename,
          appliedTime: new Date(),
        },
        { session },
      );
      timestampPrint('    done');
    }
  }
}

module.exports = MongoMigrator;
