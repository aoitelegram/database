const ms = require("ms");
const { AoiFunction, ArgsType, parseTime } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$deleteCooldown")
  .setBrackets(true)
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [table = database.tables[0]] = await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    const userId =
      context.eventData.from?.id || context.eventData.message?.from?.id;
    const chatId =
      context.eventData.chat?.id || context.eventData.message?.chat?.id;

    await database.deleteMany(table, ({ key }) => {
      const [name, , , time] = key.split("_");
      if (name !== "cooldown") return false;
      return `cooldown_${userId}_${chatId}_${time}` === key;
    });

    return func.resolve();
  });
