import { getObjectKey } from "@aoitelegram/util";
import { Collection } from "@telegram.ts/collection";
import { setTimeout, clearTimeout, type Timeout } from "long-timeout";
import {
  ArgsType,
  AoiFunction,
  AoijsTypeError,
  type AoiClient,
  type CommandData,
} from "aoitelegram";
import { type AoiManager } from "./AoiManager";

interface TimeoutData {
  id: string;
  time: number;
  datestamp: number;
  outData: Record<string, any>;
}

class TimeoutManager {
  private readonly database: AoiManager;
  private readonly timeouts: Collection<string, Timeout> = new Collection();
  private readonly registeredTimeouts: Collection<
    string,
    CommandData<{ id: string }>
  > = new Collection();

  /**
   * Creates an instance of TimeoutManager.
   * @param database - The database manager instance.
   */
  constructor(database: AoiManager) {
    this.database = database;
  }

  /**
   * Registers a timeout command description.
   * @param description - The command description to register.
   * @throws {AoijsTypeError} If the timeout ID already exists.
   */
  registerTimeout(description: CommandData<{ id: string }>): void {
    if (this.registeredTimeouts.has(description.id)) {
      throw new AoijsTypeError(
        `The current timeout '${description.id}' already exists`,
      );
    }

    this.registeredTimeouts.set(description.id, description);
  }

  /**
   * Adds a new timeout to the database.
   * @param id - The ID of the timeout.
   * @param options - The timeout options including time and output data.
   * @returns The unique ID of the added timeout.
   */
  async addTimeout(
    id: string,
    options: {
      time: number;
      outData: Record<string, any>;
    },
  ): Promise<string> {
    const data = { ...options, id, datestamp: Date.now() };
    this.database.emit("addTimeout", data);
    await this.database.set("timeout", `${id}_${data.datestamp}`, data);
    return `${id}_${data.datestamp}`;
  }

  /**
   * Removes a timeout from the database.
   * @param timeoutId - The unique ID of the timeout.
   * @returns True if the timeout was removed, false otherwise.
   */
  async removeTimeout(timeoutId: string): Promise<boolean> {
    const timeout = this.timeouts.get(timeoutId);
    if (!timeout) return false;

    clearTimeout(timeout);
    this.timeouts.delete(timeoutId);
    await this.database.delete("timeout", timeoutId);
    return true;
  }

  /**
   * Restores all timeouts from the database.
   */
  private async restoreTimeouts(): Promise<void> {
    const timeouts = await this.database.findMany(
      "timeout",
      ({ value }) => typeof value === "object" && value !== null,
    );

    for (const { key, value } of timeouts) {
      const remainingTime = value.datestamp + value.time - Date.now();
      const timeoutId = `${value.id}_${value.datestamp}`;

      if (remainingTime > 0) {
        const timeout = setTimeout(async () => {
          this.database.emit("timeout", value);
          await this.removeTimeout(timeoutId);
        }, remainingTime);
        this.timeouts.set(timeoutId, timeout);
      } else {
        this.database.emit("timeout", value);
        await this.removeTimeout(timeoutId);
      }
    }
  }

  /**
   * Handles the addition of a timeout.
   * @param timeoutData - The data of the timeout to handle.
   */
  private handleAddTimeout(timeoutData: TimeoutData): void {
    if (!timeoutData) return;

    const timeout = setTimeout(async () => {
      this.database.emit("timeout", timeoutData);
      await this.removeTimeout(`${timeoutData.id}_${timeoutData.datestamp}`);
    }, timeoutData.time);

    this.timeouts.set(`${timeoutData.id}_${timeoutData.datestamp}`, timeout);
  }

  /**
   * Handles the timeout event and executes the corresponding command.
   * @param timeoutData - The data of the timeout event.
   * @param telegram - The AoiClient instance.
   */
  private async handleTimeoutEvent(
    timeoutData: TimeoutData,
    telegram: AoiClient,
  ): Promise<void> {
    const timeoutId = `${timeoutData.id}_${timeoutData.datestamp}`;
    const timeoutDescription = this.registeredTimeouts.get(timeoutData.id);

    if (!timeoutDescription || !this.timeouts.has(timeoutId)) return;

    telegram.ensureCustomFunction(
      new AoiFunction()
        .setName("$timeoutData")
        .setBrackets(true)
        .setFields({
          name: "property",
          required: false,
          type: [ArgsType.Any],
        })
        .onCallback(async (ctx, func) => {
          const options = await func.resolveAllFields(ctx);
          return func.resolve(getObjectKey(timeoutData.outData, options));
        }),
    );

    await telegram.evaluateCommand(timeoutDescription, timeoutData);
    this.timeouts.delete(timeoutId);
  }

  /**
   * Initializes the TimeoutManager, setting up event listeners.
   * @param telegram - The AoiClient instance.
   */
  init(telegram: AoiClient): void {
    this.database.on("ready", this.restoreTimeouts.bind(this));
    this.database.on("addTimeout", this.handleAddTimeout.bind(this));
    this.database.on("timeout", async (timeoutData) => {
      await this.handleTimeoutEvent(timeoutData, telegram);
    });
  }
}

export { TimeoutManager, TimeoutData };
