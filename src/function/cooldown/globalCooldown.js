const ms = require("ms");
const { randomUUID } = require("node:crypto");
const {
  AoiFunction,
  ArgsType,
  formatTime,
  replaceData,
} = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$globalCooldown")
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
    const [time, textError, userId, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    const cooldownId = randomUUID();
    const cooldownKey = `cooldown_${userId}_${cooldownId}_${time.ms}`;
    const timeCooldown = (await database.get(table, cooldownKey)) || 0;
    const cooldown = timeCooldown + time.ms - Date.now();
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

    return func.resolve(cooldownId);
  });
