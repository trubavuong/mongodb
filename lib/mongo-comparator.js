const { areSameArrays } = require('./helper');

const dumpCollections = async collections => {
  const result = new Map();

  for (let i = 0; i < collections.length; i += 1) {
    const collection = collections[i];

    // eslint-disable-next-line no-await-in-loop
    const array = await collection.find().toArray();
    result.set(collection, array);
  }

  return result;
};

const compareCollectionsAfterAction = async ({ collections, action }) => {
  const before = await dumpCollections(collections);

  await action();

  const after = await dumpCollections(collections);

  const same = [];
  const differ = [];

  before.forEach((arrayBefore, collection) => {
    const arrayAfter = after.get(collection);
    const areSame = areSameArrays(arrayBefore, arrayAfter);
    (areSame ? same : differ).push(collection);
  });

  return {
    same,
    differ,
  };
};

module.exports = {
  compareCollectionsAfterAction,
};
