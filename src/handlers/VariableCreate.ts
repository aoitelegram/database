import type { IEventDataMap } from "../typing";
import type { AoiDB } from "../classes/AoiDB";
import { getObjectKey } from "@aoitelegram/util";
import {
  ArgsType,
  AoiFunction,
  type AoiClient,
} from "aoitelegram";

async function onVariableCreate<Class>(
  telegram: AoiClient,
  newVariable: IEventDataMap<any, Class>["create"],
  eventsCollect: AoiDB["eventsCollect"],
): Promise<void> {
  const events = eventsCollect.get("variableCreate") || [];
  for (const event of events) {
    telegram.ensureCustomFunction(
      new AoiFunction()
        .setName("$newVariable")
        .setBrackets(true)
        .setFields({
          name: "property",
          type: [ArgsType.Any],
          required: false,
        })
        .onCallback(async (context, func) => {
          const options = await func.resolveAllFields(context);
          const result = getObjectKey(newVariable, options);
          return func.resolve(result);
        }),
    );

    await telegram.evaluateCommand(event, { newVariable, telegram });
  }
}

export default onVariableCreate;
