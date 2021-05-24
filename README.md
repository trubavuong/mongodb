# mongodb

MongoDB helper

## Install

```
$ npm install @trubavuong/mongodb
```

## APIs

### MongoManager

```
const MongoManager = require('@trubavuong/mongodb');
```

#### Constructor

```
const manager = new MongoManager({
  url: 'mongodb://localhost:27017',
  database: 'example',
  collections: {
    UserCollection: 'user',
    PostCollection: 'post',
  },
});
```

#### manager.connect()

```
await manager.connect();

// after that you can use some properties:
// - manager.client // MongoDB client object
// - manager.db // MongoDB database
// - manager.UserCollection // MongoDB collection, same as defined in constructor
```

#### manager.close()

```
await manager.close();
```
