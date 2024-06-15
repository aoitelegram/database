const { AoiFunction, ArgsType } = require("aoitelegram");

module.exports = new AoiFunction()
  .setName("$resetVar")
  .setBrackets(true)
  .setFields({
    name: "variable",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [variable, table = context.database.tables[0]] =
      await func.resolveFields(context);

    if (!context.database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    const allVars = await context.database.findMany(table, ({ key }) => {
      return variable === key;
    });

    for (const { key } of allVars) {
      await context.database.set(
        table,
        key,
        context.database.collection.get(`${variable}_${table}`),
      );
    }

    return func.resolve(allVars.length);
  });
