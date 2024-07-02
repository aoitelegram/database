import { AoijsTypeError } from "aoitelegram";
import { Logger } from "@aoitelegram/util";
import { type IEventDataMap } from "../typing";
import { Collection } from "@telegram.ts/collection";
import { MySqlDB, type MySqlDBOptions } from "./MySqlDB";
import { MongoDB, type MongoDBOptions } from "./MongoDB";
import { StorageDB, type StorageDBOptions } from "./StorageDB";
import { FirebaseDB, type FirebaseDBOptions } from "./FirebaseDB";

type AoiManagerOptions = { logging?: boolean } & (
  | { type: "storage"; options?: StorageDBOptions }
  | { type: "mongo"; url: string; options?: MongoDBOptions }
  | { type: "firebase"; url: string; options?: FirebaseDBOptions }
  | { type: "mysql"; options: MySqlDBOptions & { tables?: string[] } }
);

class AoiManager<Value = any> {
  public readonly tables: string[];
  public readonly database:
    | StorageDB<Value>
    | MongoDB<Value>
    | FirebaseDB<Value>
    | MySqlDB<Value>;
  public readonly collection: Collection<string, Value> = new Collection();

  /**
   * Creates an instance of AoiManager.
   * @param options - The options for configuring the AoiManager.
   */
  constructor(
    options: AoiManagerOptions = {
      type: "storage",
      logging: true,
      options: {
        path: "database",
        tables: ["main"],
      },
    },
  ) {
    if (typeof options !== "object") {
      throw new AoijsTypeError(
        `The expected type is "object", but received type ${typeof options}`,
      );
    } else this.#validateOptions(options);

    options.options ??= {};
    if (Array.isArray(options.options?.tables)) {
      options.options.tables = [...options.options.tables, "timeout"];
    } else {
      options.options.tables = ["main", "timeout"];
    }
    this.tables = options.options.tables;
    if (options.type === "storage") {
      this.database = new StorageDB(options.options);
    } else if (options.type === "mongo") {
      this.database = new MongoDB(options.url, options.options);
    } else if (options.type === "firebase") {
      this.database = new FirebaseDB(options.url, options.options);
    } else if (options.type === "mysql") {
      this.database = new MySqlDB(options.options, options.options?.tables);
    } else {
      throw new AoijsTypeError(`Invalid type database`);
    }

    if (options.logging === undefined || options.logging) {
      this.on("ready", async (ctx) => {
        Logger.info("Database has been established");
      });
    }
  }

  /**
   * Adds an event listener.
   * @param eventName - The name of the event.
   * @param listener - The callback function for the event.
   */
  on<T extends keyof IEventDataMap<Value, this["database"]>>(
    eventName: T,
    listener: (args: IEventDataMap<Value, this["database"]>[T]) => void,
  ) {
    return this.database.on(eventName, listener);
  }

  /**
   * Adds a one-time event listener.
   * @param eventName - The name of the event.
   * @param listener - The callback function for the event.
   */
  once<T extends keyof IEventDataMap<Value, this["database"]>>(
    eventName: T,
    listener: (args: IEventDataMap<Value, this["database"]>[T]) => void,
  ) {
    return this.database.once(eventName, listener);
  }

  /**
   * Removes an event listener.
   * @param eventName - The name of the event.
   * @param listener - The callback function for the event.
   */
  off<T extends keyof IEventDataMap<Value, this["database"]>>(
    eventName: T,
    listener: (args: IEventDataMap<Value, this["database"]>[T]) => void,
  ) {
    return this.database.off(eventName, listener);
  }

  /**
   * Emits an event.
   * @param eventName - The name of the event.
   * @param eventData - The data for the event.
   */
  emit<T extends keyof IEventDataMap<Value, this["database"]>>(
    eventName: T,
    eventData: IEventDataMap<Value, this["database"]>[T],
  ) {
    return this.database.emit(eventName, eventData);
  }

  /**
   * Gets a value from the database.
   * @param table - The table name.
   * @param key - The key.
   * @returns The value.
   */
  async get(table: string, key: string): Promise<Value | undefined> {
    return await this.database.get(table, key);
  }

  /**
   * Sets a value in the database.
   * @param table - The table name.
   * @param key - The key.
   * @param value - The value.
   * @returns The instance of AoiManager.
   */
  async set(table: string, key: string, value: Value): Promise<this> {
    await this.database.set(table, key, value);
    return this;
  }

  /**
   * Checks if a key exists in the database.
   * @param table - The table name.
   * @param key - The key.
   * @returns A boolean indicating if the key exists.
   */
  async has(table: string, key: string): Promise<boolean> {
    return await this.database.has(table, key);
  }

  /**
   * Gets all values from a table.
   * @param table - The table name.
   * @returns An object containing all key-value pairs.
   */
  async all(table: string): Promise<{
    [key: string]: Value;
  }> {
    return await this.database.all(table);
  }

  /**
   * Finds one entry in a table that matches the callback criteria.
   * @param table - The table name.
   * @param callback - The callback function to match entries.
   * @returns The matching entry or null.
   */
  async findOne(
    table: string,
    callback: (
      entry: {
        key: string;
        value: Value;
      },
      index: number,
    ) => boolean | Promise<boolean>,
  ): Promise<{
    key: string;
    value: Value;
    index: number;
  } | null> {
    return await this.database.findOne(table, callback);
  }

  /**
   * Finds multiple entries in a table that match the callback criteria.
   * @param table - The table name.
   * @param callback - The callback function to match entries.
   * @returns An array of matching entries.
   */
  async findMany(
    table: string,
    callback: (
      entry: {
        key: string;
        value: Value;
      },
      index: number,
    ) => boolean | Promise<boolean>,
  ): Promise<
    {
      key: string;
      value: Value;
      index: number;
    }[]
  > {
    return await this.database.findMany(table, callback);
  }

  /**
   * Deletes multiple entries in a table that match the callback criteria.
   * @param table - The table name.
   * @param callback - The callback function to match entries.
   */
  async deleteMany(
    table: string,
    callback: (
      entry: {
        key: string;
        value: Value;
      },
      index: number,
    ) => boolean | Promise<boolean>,
  ): Promise<void> {
    return await this.database.deleteMany(table, callback);
  }

  /**
   * Deletes an entry or entries in a table.
   * @param table - The table name.
   * @param key - The key or keys to delete.
   */
  async delete(table: string, key: string | string[]): Promise<void> {
    return await this.database.delete(table, key);
  }

  /**
   * Clears all entries in a table.
   * @param table - The table name.
   */
  async clear(table: string): Promise<void> {
    return await this.database.clear(table);
  }

  /**
   * Converts a file to a table in the database.
   * @param table - The table name.
   * @param filePath - The file path.
   */
  async convertFileToTable(table: string, filePath: string): Promise<void> {
    return await this.database.convertFileToTable(table, filePath);
  }

  /**
   * Converts a table to a file.
   * @param table - The table name.
   * @param filePath - The file path.
   */
  async convertTableToFile(table: string, filePath: string): Promise<void> {
    return await this.database.convertTableToFile(table, filePath);
  }

  /**
   * Pings the database.
   * @returns The ping time in milliseconds.
   */
  async ping(): Promise<number> {
    return await this.database.ping();
  }

  /**
   * Connects to the database.
   */
  async connect(): Promise<void> {
    return await this.database.connect();
  }

  /**
   * Checks if a table exists.
   * @param table - The table name.
   * @returns A boolean indicating if the table exists.
   */
  hasTable(table: string): boolean {
    return this.tables.indexOf(table) !== -1;
  }

  /**
   * Gets the default value for a variable.
   * @param vars - The variable name.
   * @param table - The table name.
   * @returns The default value of the variable.
   */
  defaulValue(vars: string, table: string): any {
    return this.collection.get(`${vars}_${table}`);
  }

  /**
   * Sets variables in the specified tables.
   * @param options - The variables to set.
   * @param tables - The table or tables to set the variables in.
   */
  async variables(
    options: { [key: string]: any },
    tables: string | string[] = this.tables[0],
  ): Promise<void> {
    if (Array.isArray(tables)) {
      for (const table of tables) {
        for (const varName in options) {
          if (!options.hasOwnProperty(varName)) continue;
          const hasVar = await this.has(table, varName);
          this.collection.set(`${varName}_${table}`, options[varName]);
          if (!hasVar) {
            await this.set(table, varName, options[varName]);
          }
        }
      }
    } else if (typeof tables === "string") {
      for (const varName in options) {
        if (!options.hasOwnProperty(varName)) continue;
        const hasVar = await this.has(tables, varName);
        this.collection.set(`${varName}_${tables}`, options[varName]);
        if (!hasVar) {
          await this.set(tables, varName, options[varName]);
        }
      }
    } else {
      throw new AoijsTypeError(
        "The parameter should be of type 'string' or 'string[]'",
      );
    }
  }

  #validateOptions(options: Record<string, any>) {
    if (!options.type) {
      throw new AoijsTypeError(
        "You need to specify the type of database you will be using, available options are storage | mongo | firebase",
      );
    }

    if ("type" in options) {
      if (
        options.type !== "storage" &&
        options.type !== "mongo" &&
        options.type !== "firebase"
      ) {
        throw new AoijsTypeError(
          'Only "storage", "mongo", or "firebase" are valid values for the type property',
        );
      }

      if (
        (options.type === "mongo" || options.type === "firebase") &&
        !("url" in options)
      ) {
        throw new AoijsTypeError(
          'For "mongo" or "firebase" type, a "url" parameter is required',
        );
      }
    }

    if ("logging" in options) {
      if (
        typeof options.logging !== "boolean" &&
        typeof options.logging !== "undefined"
      ) {
        throw new AoijsTypeError(
          "Logging property must be a boolean or undefined",
        );
      }
    }
  }
}

export { AoiManager, AoiManagerOptions };
