module.exports = async (manager, session) => {
  await manager.UserCollection.insertOne(
    { username: 'the-second' },
    { session },
  );
};
