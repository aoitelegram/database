const ms = require("ms");
const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$stopTimeout")
  .setBrackets(true)
  .setFields({
    name: "timeoutId",
    required: true,
    type: [ArgsType.String],
  })
  .onCallback(async (context, func) => {
    const timeoutManager = func.getOther();
    const [timeoutId] = await func.resolveFields(context);

    return func.resolve(await timeoutManager.removeTimeout(timeoutId));
  });
