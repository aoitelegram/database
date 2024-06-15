const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$resetMessageVar")
  .setBrackets(true)
  .setFields({
    name: "variable",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "messageId",
    required: false,
    type: [ArgsType.Number],
    defaultValue: (context) =>
      context.eventData?.message_id || context.eventData?.message?.message_id,
  })
  .setFields({
    name: "chatId",
    required: false,
    type: [ArgsType.Any],
    defaultValue: (context) =>
      context.eventData.chat?.id || context.eventData.message?.chat?.id,
  })
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [variable, messageId, chatId, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    if (!database.collection.has(`${variable}_${table}`)) {
      return func.reject(`Invalid variable "${variable}" not found`);
    }

    const allMessages = await database.findMany(table, ({ key }) => {
      return `message_${key.split("_")[1]}_${chatId}_${variable}` === key;
    });

    for (const { key } of allMessages) {
      await database.set(
        table,
        key,
        database.collection.get(`${variable}_${table}`),
      );
    }

    return func.resolve(allMessages.length);
  });
