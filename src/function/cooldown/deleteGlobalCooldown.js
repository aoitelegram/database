const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$deleteGlobalCooldown")
  .setBrackets(true)
  .setFields({
    name: "id",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "userId",
    required: false,
    type: [ArgsType.String],
    defaultValue: (context) =>
      context.eventData.from?.id || context.eventData.message?.from?.id,
  })
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [id, userId, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    await database.deleteMany(table, ({ key }) => {
      const [name, , keyId, time] = key.split("_");
      if (name !== "cooldown") return false;
      return `cooldown_${userId}_${keyId}_${time}` === key;
    });

    return func.resolve();
  });
