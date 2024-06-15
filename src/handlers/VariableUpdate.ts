import type { IEventDataMap } from "../typing";
import type { AoiDB } from "../classes/AoiDB";
import {
  ArgsType,
  AoiFunction,
  getObjectKey,
  type AoiClient,
} from "aoitelegram";

async function onVariableUpdate<Class>(
  telegram: AoiClient,
  variable: IEventDataMap<any, Class>["update"],
  eventsCollect: AoiDB["eventsCollect"],
): Promise<void> {
  const events = eventsCollect.get("variableUpdate") || [];
  for (const event of events) {
    telegram.ensureCustomFunction(
      new AoiFunction()
        .setName("$variable")
        .setBrackets(true)
        .setFields({
          name: "property",
          type: [ArgsType.Any],
          required: false,
        })
        .onCallback(async (context, func) => {
          const options = await func.resolveAllFields(context);
          const result = getObjectKey(variable, options);
          return func.resolve(result);
        }),
    );

    await telegram.evaluateCommand(event, { variable, telegram });
  }
}

export default onVariableUpdate;
