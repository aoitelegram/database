const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$setUserVar")
  .setBrackets(true)
  .setFields({
    name: "variable",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "value",
    required: true,
    type: [ArgsType.Any],
  })
  .setFields({
    name: "userId",
    required: false,
    type: [ArgsType.Number],
    defaultValue: (context) =>
      context.eventData.from?.id || context.eventData.message?.from?.id,
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
    const [variable, value, userId, chatId, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    if (!database.collection.has(`${variable}_${table}`)) {
      return func.reject(`Invalid variable "${variable}" not found`);
    }

    await database.set(table, `user_${userId}_${chatId}_${variable}`, value);

    return func.resolve(true);
  });
