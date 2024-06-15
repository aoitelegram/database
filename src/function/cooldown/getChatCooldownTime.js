const ms = require("ms");
const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$getChatCooldownTime")
  .setBrackets(true)
  .setFields({
    name: "chatId",
    required: false,
    type: [ArgsType.Chat],
    defaultValue: (context) =>
      context.eventData.chat?.id || context.eventData.message?.chat.id,
  })
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [chatId, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    const timeCooldown = await database.findOne(table, ({ key }) => {
      const [name, , time] = key.split("_");
      if (name !== "cooldown") return false;
      return `cooldown_${chatId}_${time}` === key;
    });

    return func.resolve(
      timeCooldown
        ? timeCooldown.value + timeCooldown.key.split("_")[2] - Date.now()
        : null,
    );
  });
