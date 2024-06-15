const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$deleteUserVar")
  .setBrackets(true)
  .setFields({
    name: "variable",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "userId",
    required: false,
    type: [ArgsType.Number],
    defaultValue: (context) =>
      context.eventData?.from?.id || context.eventData?.message?.from?.id,
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
    const [variable, userId, chatId, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!(await database.hasTable(table))) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    if (!database.collection.has(`${variable}_${table}`)) {
      return func.reject(`Invalid variable "${variable}" not found`);
    }

    return func.resolve(
      await database.delete(table, `user_${userId}_${chatId}_${variable}`),
    );
  });
