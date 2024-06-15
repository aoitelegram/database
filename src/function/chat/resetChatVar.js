const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$resetChatVar")
  .setBrackets(true)
  .setFields({
    name: "variable",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "chatId",
    required: false,
    type: [ArgsType.String, ArgsType.Number],
  })
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [variable, chatId, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    if (!database.collection.has(`${variable}_${table}`)) {
      return func.reject(`Invalid variable "${variable}" not found`);
    }

    const allChats = await database.findMany(table, ({ key }) => {
      return `chat_${chatId || key.split("_")[1]}_${variable}` === key;
    });

    for (const { key } of allChats) {
      await database.set(
        table,
        key,
        database.collection.get(`${variable}_${table}`),
      );
    }

    return func.resolve(allChats.length);
  });
