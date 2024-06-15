const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$getLoaderboardInfo")
  .setBrackets(true)
  .setFields({
    name: "variable",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "id",
    required: true,
    type: [ArgsType.Chat],
  })
  .setFields({
    name: "type",
    required: false,
    type: [ArgsType.String],
    defaultValue: "user",
  })
  .setFields({
    name: "property",
    required: false,
    type: [ArgsType.String],
    defaultValue: "top",
  })
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [variable, id, type, property, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    if (!database.collection.has(`${variable}_${table}`)) {
      return func.reject(`Invalid variable "${variable}" not found`);
    }

    const searchInfo = await database.findOne(table, ({ key }) => {
      const [, chatId, ...other] = key.split("_");
      if (type === "user") {
        return `user_${id}_${other[2]}_${variable}` === key;
      } else if (type === "chat") {
        return `chat_${id}_${variable}` === key;
      }
    });

    switch (property) {
      case "value":
        return func.resolve(searchInfo?.value);
      case "top":
        return func.resolve(searchInfo?.index);
      default:
        return func.resolve(
          getObjectKey(await context.telegram.getChat(id), property),
        );
    }
  });
