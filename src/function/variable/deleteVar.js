const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$deleteVar")
  .setBrackets(true)
  .setFields({
    name: "variable",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "returnValue",
    required: false,
    type: [ArgsType.Boolean],
  })
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [variable, returnValue, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    if (returnValue) {
      const value = await database.get(table, variable);
      await database.delete(table, variable);
      return func.resolve(value);
    }

    return func.resolve();
  });
