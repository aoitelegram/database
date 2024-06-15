const { AoiFunction, ArgsType } = require("aoitelegram");

function replaceText(text, chatData) {
  return text
    .replace(/{top}/g, `${chatData.top}`)
    .replace(/{id}/g, `${chatData.id}`)
    .replace(/{type}/g, `${chatData.type}`)
    .replace(/{title}/g, `${chatData?.title}`)
    .replace(/{description}/g, `${chatData?.description}`)
    .replace(/{invite_link}/g, `${chatData?.invite_link}`)
    .replace(/{value}/g, `${chatData.value}`);
}

module.exports = new AoiFunction()
  .setName("$chatLeaderBoard")
  .setBrackets(true)
  .setFields({
    name: "variable",
    required: true,
    type: [ArgsType.String],
  })
  .setFields({
    name: "type",
    required: false,
    type: [ArgsType.String],
    defaultValue: "asc",
  })
  .setFields({
    name: "text",
    required: false,
    type: [ArgsType.String],
    defaultValue: "{top}. {title} - {value}\n",
  })
  .setFields({
    name: "maxChat",
    required: false,
    type: [ArgsType.Number],
    defaultValue: 10,
  })
  .setFields({
    name: "table",
    required: false,
    type: [ArgsType.Any],
  })
  .onCallback(async (context, func) => {
    const database = func.getOther();
    const [variable, type, text, maxChat, table = database.tables[0]] =
      await func.resolveFields(context);

    if (!database.hasTable(table)) {
      return func.reject(`Invalid table "${table}" not found`);
    }

    if (!database.collection.has(`${variable}_${table}`)) {
      return func.reject(`Invalid variable "${variable}" not found`);
    }

    const chatList = await database.findMany(table, ({ key, value }) => {
      const [, chatIdKey, variableKey] = key.split("_");
      return (
        `chat_${chatIdKey}_${variableKey}` ===
          `chat_${chatIdKey}_${variable}` && !isNaN(Number(value))
      );
    });

    chatList.sort((a, b) => {
      return type === "asc" ? b.value - a.value : a.value - b.value;
    });

    let textResult = "";

    for (let i = 0; i < chatList.length; i++) {
      if (i + 1 === maxChat) break;

      const [chatId, value] = [
        chatList[i].key.split("_")[1],
        chatList[i].value,
      ];
      const chatData = await context.telegram.getChat(chatId);

      textResult += replaceText(text, {
        ...chatData,
        value,
        top: i + 1,
      });
    }

    return func.resolve(textResult);
  });
