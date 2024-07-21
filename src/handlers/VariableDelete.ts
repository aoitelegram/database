import type { IEventDataMap } from "../typing";
import type { AoiDB } from "../classes/AoiDB";
import { getObjectKey } from "@aoitelegram/util";
import {
  ArgsType,
  AoiFunction,
  type AoiClient,
} from "aoitelegram";

async function onVariableDelete<Class>(
  telegram: AoiClient,
  oldVariable: IEventDataMap<any, Class>["delete"],
  eventsCollect: AoiDB["eventsCollect"],
): Promise<void> {
  const events = eventsCollect.get("variableDelete") || [];
  for (const event of events) {
    telegram.ensureCustomFunction(
      new AoiFunction()
        .setName("$oldVariable")
        .setBrackets(true)
        .setFields({
          name: "property",
          type: [ArgsType.Any],
          required: false,
        })
        .onCallback(async (context, func) => {
          const options = await func.resolveAllFields(context);
          const result = getObjectKey(oldVariable, options);
          return func.resolve(result);
        }),
    );

    await telegram.evaluateCommand(event, { oldVariable, telegram });
  }
}

export default onVariableDelete;
