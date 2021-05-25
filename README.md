# mongodb

MongoDB helper

## Install

```
$ npm install @trubavuong/mongodb
```

## APIs

### MongoManager

```
const { MongoManager } = require('@trubavuong/mongodb');
```

#### Constructor

```
const manager = new MongoManager({
  url: 'mongodb://localhost:27017', // endpoint
  database: 'example',              // database name
  collections: {                    // alias - collection name map
    UserCollection: 'user',
    PostCollection: 'post',
  },
});
```

#### manager.connect()

Connects to MongoDB server and populate some properties

```
await manager.connect();

// after that you can use some properties:
// - manager.client         // MongoDB client object
// - manager.db             // MongoDB database
// - manager.UserCollection // MongoDB collection alias, same as defined in constructor
```

#### manager.close()

Closes client

```
await manager.close();
```

### MongoMigrator

```
const { MongoMigrator } = require('@trubavuong/mongodb');
```

#### Constructor

```
const migrator = new MongoMigrator({
  manager,                                         // MongoManager instance
  migrationCollectionAlias: 'MigrationCollection', // MongoDB migration collection alias
  migrationDirectory: 'migrations',                // migration directory
});
```

#### migrator.createNewMigrationFile(name)

Creates a new migration file

```
await migrator.createNewMigrationFile('update-users');

// this will create a new file in migration directory
// if the directory is empty, filename should be '1.update-users.js'
// else the latest migration file such as named '8.create-post-indexes.js', filename should be '9.update-users.js'
```

#### migrator.status()

Shows migration status

```
await migrator.status();
```

#### migrator.migrate()

Executes migration files each by each automatically

```
await migrator.migrate();
```
