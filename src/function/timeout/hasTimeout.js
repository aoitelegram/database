const ms = require("ms");
const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$hasTimeout")
  .setBrackets(true)
  .setFields({
    name: "timeoutId",
    required: false,
    type: [ArgsType.String],
    defaultValue: ", ",
  })
  .onCallback(async (context, func) => {
    const timeoutManager = func.getOther();
    const [timeoutId] = await func.resolveFields(context);

    return func.resolve(timeoutManager.timeouts.has(timeoutId));
  });
