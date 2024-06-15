import path from "node:path";
import fs from "node:fs/promises";
import { Collection } from "@telegram.ts/collection";
import { TimeoutManager } from "./TimeoutManager";
import { AoiManager, type AoiManagerOptions } from "./AoiManager";
import {
  AoiExtension,
  AoijsError,
  type AoiClient,
  type CommandData,
} from "aoitelegram";
import onVariableCreate from "../handlers/VariableCreate";
import onVariableDelete from "../handlers/VariableDelete";
import onVariableUpdate from "../handlers/VariableUpdate";

class AoiDB extends AoiExtension {
  public name = "AoiDB";
  public description =
    "A custom database designed specifically for aoitelegram";
  public version = "1.1.0";
  public database: AoiManager;
  public timeoutManager: TimeoutManager;
  public variablesCollect: Collection<string | string[], Record<string, any>> =
    new Collection();
  public eventsCollect: Collection<string, CommandData[]> = new Collection();

  constructor(options?: AoiManagerOptions) {
    super();
    this.database = new AoiManager(options);
    this.timeoutManager = new TimeoutManager(this.database);
  }

  timeoutCommand(options: CommandData<{ id: string }>): AoiDB {
    if (!options?.id) {
      throw new AoijsError("You did not specify the 'id' parameter");
    }
    if (!options?.code) {
      throw new AoijsError("You did not specify the 'code' parameter");
    }
    this.timeoutManager.registerTimeout(options);
    return this;
  }

  variableCreateCommand(options: CommandData): AoiDB {
    if (!options?.code) {
      throw new AoijsError("You did not specify the 'code' parameter");
    }
    this.addEvents("variableCreate", options);
    return this;
  }

  variableUpdateCommand(options: CommandData): AoiDB {
    if (!options?.code) {
      throw new AoijsError("You did not specify the 'code' parameter");
    }
    this.addEvents("variableUpdate", options);
    return this;
  }

  variableDeleteCommand(options: CommandData): AoiDB {
    if (!options?.code) {
      throw new AoijsError("You did not specify the 'code' parameter");
    }
    this.addEvents("variableDelete", options);
    return this;
  }

  variables(
    variable: Record<string, any>,
    tables: string | string[] = "main",
  ): AoiDB {
    this.variablesCollect.set(tables, variable);
    return this;
  }

  async init(telegram: AoiClient) {
    await this.database.connect().then(async () => {
      for (const [tables, variables] of this.variablesCollect) {
        await this.database.variables(variables, tables);
      }
    });
    await this.loadFunction(telegram).then(() => {
      this.timeoutManager.init(telegram);
      this.database.on("create", async (data) => {
        await onVariableCreate<typeof this.database>(
          telegram,
          data,
          this.eventsCollect,
        );
      });
      this.database.on("update", async (data) => {
        await onVariableUpdate<typeof this.database>(
          telegram,
          data,
          this.eventsCollect,
        );
      });
      this.database.on("delete", async (data) => {
        await onVariableDelete<typeof this.database>(
          telegram,
          data,
          this.eventsCollect,
        );
      });
    });
    return;
  }

  private addEvents(
    type: "variableDelete" | "variableUpdate" | "variableCreate",
    options: CommandData,
  ): void {
    if (this.eventsCollect.has(type)) {
      const eventsType = this.eventsCollect.get(type);
      this.eventsCollect.set(type, [...(eventsType || []), options]);
    } else this.eventsCollect.set(type, [options]);
    return;
  }

  private async loadFunction(telegram: AoiClient): Promise<void> {
    const dirPath = path.join(__dirname, "../function/");
    const files = await fs.readdir(dirPath, {
      recursive: true,
    });
    for (const file of files.filter((file) => file.endsWith(".js"))) {
      const { default: dataFunction } = await import(path.join(dirPath, file));
      if (dataFunction.name.endsWith("Timeout")) {
        dataFunction.setOther(this.timeoutManager);
      } else dataFunction.setOther(this.database);
      telegram.createCustomFunction(dataFunction);
    }
    return;
  }
}

export { AoiDB };
