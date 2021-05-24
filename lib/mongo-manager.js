const { MongoClient } = require('mongodb');

class MongoManager {
  constructor({
    url,
    options = {},
    database,
    collections = {},
  }) {
    this.client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferMaxEntries: 0,
      ...options,
    });

    this.db = null;

    this.params = {
      database,
      collections,
    };
  }

  async connect() {
    await this.client.connect();

    const { database, collections } = this.params;

    this.db = this.client.db(database);

    Object.entries(collections).forEach(([alias, name]) => {
      this[alias] = this.db.collection(name);
    });
  }

  async close() {
    await this.client.close();

    const { collections } = this.params;

    this.db = null;

    Object.keys(collections).forEach(alias => {
      delete this[alias];
    });
  }
}

module.exports = MongoManager;
