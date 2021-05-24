const isEqual = require('lodash.isequal');

const areSameArrays = (arrayA, arrayB) => {
  if (arrayA.length !== arrayB.length) {
    return false;
  }

  return arrayA.every(itemA => {
    const itemB = arrayB.find(anItemB => anItemB._id.equals(itemA._id));
    if (!itemB) {
      return false;
    }

    return isEqual(itemA, itemB);
  });
};

module.exports = {
  areSameArrays,
};
