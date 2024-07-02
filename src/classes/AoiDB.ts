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

  /**
   * Creates an instance of AoiDB.
   * @param options - The options for the AoiManager.
   */
  constructor(options?: AoiManagerOptions) {
    super();
    this.database = new AoiManager(options);
    this.timeoutManager = new TimeoutManager(this.database);
  }

  /**
   * Registers a timeout command.
   * @param options - The command data.
   * @returns The instance of AoiDB.
   * @throws AoijsError if the 'id' or 'code' parameter is not specified.
   */
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

  /**
   * Registers a variable create command.
   * @param options - The command data.
   * @returns The instance of AoiDB.
   * @throws AoijsError if the 'code' parameter is not specified.
   */
  variableCreateCommand(options: CommandData): AoiDB {
    if (!options?.code) {
      throw new AoijsError("You did not specify the 'code' parameter");
    }
    this.addEvents("variableCreate", options);
    return this;
  }

  /**
   * Registers a variable update command.
   * @param options - The command data.
   * @returns The instance of AoiDB.
   * @throws AoijsError if the 'code' parameter is not specified.
   */
  variableUpdateCommand(options: CommandData): AoiDB {
    if (!options?.code) {
      throw new AoijsError("You did not specify the 'code' parameter");
    }
    this.addEvents("variableUpdate", options);
    return this;
  }

  /**
   * Registers a variable delete command.
   * @param options - The command data.
   * @returns The instance of AoiDB.
   * @throws AoijsError if the 'code' parameter is not specified.
   */
  variableDeleteCommand(options: CommandData): AoiDB {
    if (!options?.code) {
      throw new AoijsError("You did not specify the 'code' parameter");
    }
    this.addEvents("variableDelete", options);
    return this;
  }

  /**
   * Sets the variables for the database.
   * @param variable - The variable data.
   * @param tables - The table(s) to store the variable data in.
   * @returns The instance of AoiDB.
   */
  variables(
    variable: Record<string, any>,
    tables: string | string[] = "main",
  ): AoiDB {
    this.variablesCollect.set(tables, variable);
    return this;
  }

  /**
   * Initializes the database and loads functions.
   * @param telegram - The AoiClient instance.
   */
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

  /**
   * Adds events to the event collection.
   * @param type - The type of event.
   * @param options - The command data.
   */
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

  /**
   * Loads custom functions from the function directory.
   * @param telegram - The AoiClient instance.
   */
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
