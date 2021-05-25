const index = require('../lib/index');

describe('index.js', () => {
  test('should contain modules', () => {
    [
      'og',
      'MongoManager',
      'MongoMigrator',
    ].forEach(property => {
      expect(index).toHaveProperty(property);
    });
  });
});
