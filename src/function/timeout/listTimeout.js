const ms = require("ms");
const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$listTimeout")
  .setBrackets(true)
  .setFields({
    name: "sep",
    required: false,
    type: [ArgsType.String],
    defaultValue: ", ",
  })
  .onCallback(async (context, func) => {
    const timeoutManager = func.getOther();
    const [sep] = await func.resolveFields(context);

    return func.resolve(timeoutManager.timeouts.keys().join(sep));
  });
