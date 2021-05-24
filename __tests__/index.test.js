const index = require('../lib/index');

describe('index.js', () => {
  test('should contain modules', () => {
    ['MongoManager'].forEach(property => {
      expect(index).toHaveProperty(property);
    });
  });
});
