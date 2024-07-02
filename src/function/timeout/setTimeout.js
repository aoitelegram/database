const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$setTimeout")
  .setBrackets(true)
  .setFields({
    name: "timeoutId",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "time",
    required: true,
    type: [ArgsType.Time],
  })
  .setFields({
    name: "timeoutData",
    required: false,
    type: [ArgsType.Object],
  })
  .onCallback(async (context, func) => {
    const timeoutManager = func.getOther();
    const [timeoutId, { ms }, timeoutData] = await func.resolveFields(context);

    return func.resolve(
      await timeoutManager.addTimeout(timeoutId, {
        time: ms,
        outData: timeoutData || {},
      }),
    );
  });
