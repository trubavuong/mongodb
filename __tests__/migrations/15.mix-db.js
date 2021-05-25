module.exports = async (manager, session) => {
  await manager.UserCollection.updateOne(
    { username: 'the-second' },
    { $set: { username: 'the-final' } },
    { session },
  );
};
