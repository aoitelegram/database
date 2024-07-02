const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$getCommandTimeout")
  .setAliases("$getCmdTimeout")
  .setBrackets(true)
  .setFields({
    name: "timeoutId",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "property",
    required: false,
    type: [ArgsType.String],
    defaultValue: "code",
  })
  .onCallback(async (context, func) => {
    const timeoutManager = func.getOther();
    const [timeoutId, property] = await func.resolveFields(context);

    return func.resolve(
      timeoutManager.registeredTimeouts.get(timeoutId)?.[property],
    );
  });
