const {
  AoiFunction,
  ArgsType,
  formatTime,
  replaceData,
} = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$chatCooldown")
  .setBrackets(true)
  .setFields({
    name: "time",
    required: true,
    type: [ArgsType.Time],
  })
  .setFields({
    name: "textError",
    required: false,
    type: [ArgsType.String],
  })
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [time, textError, table = database.tables[0]] =
      await func.resolveFields(context);

    const chatId =
      context.eventData.chat?.id || context.eventData.message?.chat.id;

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    const cooldownKey = `cooldown_${chatId}_${time.ms}`;
    const userCooldown = (await database.get(table, cooldownKey)) || 0;
    const cooldown = userCooldown + time.ms - Date.now();
    if (cooldown > 0) {
      if (textError) {
        if ("reply" in context.eventData)
          return func.reject(
            replaceData(formatTime(cooldown).units, textError),
            true,
          );
      } else {
        context.stopCode = true;
        return func.resolve();
      }
    } else {
      await database.set(table, cooldownKey, Date.now());
    }

    return func.resolve();
  });
