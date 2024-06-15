import fs from "node:fs/promises";
import { join } from "node:path";
import getStream from "get-stream";
import { createReadStream, createWriteStream } from "node:fs";
import { ManagerEvents } from "./ManagerEvents";
import { deepEqualTry } from "../utils";

type StorageDBOptions = {
  path: string;
  tables: string[];
  extname?: string;
};

/**
 * Represents a generic storage manager using JSON files.
 * @typeparam V The type of values stored in the database.
 */
class StorageDB<V> extends ManagerEvents<V, StorageDB<V>> {
  #isReady: boolean = false;
  public readonly options: {
    path: string;
    tables: string[];
    extname: string;
  };

  /**
   * Constructs a new StorageDB instance.
   * @param options Configuration options for the storage manager.
   */
  constructor(
    options: {
      path?: string;
      tables?: string[];
      extname?: string;
    } = {},
  ) {
    super();
    this.options = {
      path: options.path || "./database/",
      tables: options.tables || ["main"],
      extname: options.extname || ".json",
    };
  }

  private async getData(tableName: string) {
    const { path, tables, extname } = this.options;

    if (!this.#isReady) {
      throw new Error(
        'After employing the techniques, incinerate the class utilizing the "<StorageDB>.connect" method',
      );
    }

    if (tables.findIndex((table) => table === tableName) === -1) {
      throw new Error(`The specified table "${tableName}" is not available`);
    }

    const filePath = join(process.cwd(), path, tableName, `storage${extname}`);

    try {
      const stream = createReadStream(filePath);
      const buffer = await getStream.buffer(stream);
      const fileData = buffer.toString()
        ? buffer.toString()
        : await getStream.buffer(createReadStream(filePath));
      return JSON.parse(fileData as unknown as string);
    } catch (err) {
      console.log(err);
      return {};
    }
  }

  private async setData(tableName: string, data: unknown) {
    const { path, tables, extname } = this.options;

    if (tables.findIndex((table) => table === tableName) === -1) {
      throw new Error(`The specified table "${tableName}" is not available`);
    }

    const content = JSON.stringify(data);
    const filePath = join(process.cwd(), path, tableName, `storage${extname}`);

    createWriteStream(filePath).write(content);
  }

  /**
   * Retrieves a value associated with the specified key from the specified table.
   * @param table The name of the table.
   * @param key The key to retrieve the value for.
   * @returns The value associated with the key, if found; otherwise, undefined.
   */
  async get(table: string, key: string): Promise<V | undefined> {
    const data = await this.getData(table);
    return data[key]?.["value"];
  }

  /**
   * Sets a value associated with the specified key in the specified table.
   * Emits "create" event if the key does not exist, and "update" event if the value changes.
   * @param table The name of the table.
   * @param key The key to associate the value with.
   * @param value The value to set.
   * @returns This instance for chaining.
   */
  async set(table: string, key: string, value: V) {
    let data = await this.getData(table);
    if (!data[key]) {
      this.emit("create", {
        table,
        variable: key,
        data: value,
      });
    } else if (!deepEqualTry(value, data[key]?.value)) {
      this.emit("update", {
        table,
        variable: key,
        newData: value,
        oldData: data[key].value,
      });
    }
    data[key] = { key, value };
    await this.setData(table, data);
    return this;
  }

  /**
   * Checks if a key exists in the specified table.
   * @param table The name of the table.
   * @param key The key to check for existence.
   * @returns True if the key exists, false otherwise.
   */
  async has(table: string, key: string) {
    const data = await this.getData(table);
    return typeof data[key] === "object";
  }

  /**
   * Retrieves all key-value pairs from the specified table.
   * @param table The name of the table.
   * @returns An object containing all key-value pairs in the table.
   */
  async all(table: string) {
    let entries: { [key: string]: V } = {};
    const data: { [key: string]: { value: V } } = await this.getData(table);
    Object.entries(data).forEach(
      ([key, value]) => (entries[String(key)] = value.value),
    );
    return entries;
  }

  /**
   * Finds the first key-value pair in the specified table that satisfies the provided condition.
   * @param table The name of the table.
   * @param callback A function that defines the condition.
   * @returns An object containing the key-value pair that satisfies the condition, or null if no such pair is found.
   */
  async findOne(
    table: string,
    callback: (
      entry: { key: string; value: V },
      index: number,
    ) => boolean | Promise<boolean>,
  ) {
    const entries = Object.entries(await this.all(table));

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      const entry = { key, value, index: i };

      if (await callback(entry, i)) {
        return entry;
      }
    }

    return null;
  }

  /**
   * Finds all key-value pairs in the specified table that satisfy the provided condition.
   * @param table The name of the table.
   * @param callback A function that defines the condition.
   * @returns An array of objects containing the key-value pairs that satisfy the condition.
   */
  async findMany(
    table: string,
    callback: (
      entry: { key: string; value: V },
      index: number,
    ) => boolean | Promise<boolean>,
  ) {
    let entries: { key: string; value: V; index: number }[] = [];
    const allEntries = Object.entries(await this.all(table));

    for (let i = 0; i < allEntries.length; i++) {
      const [key, value] = allEntries[i];
      const processedEntry = { key, value, index: i };

      if (await callback(processedEntry, i)) {
        entries.push(processedEntry);
      }
    }

    return entries;
  }

  /**
   * Deletes all key-value pairs in the specified table that satisfy the provided condition.
   * @param table The name of the table.
   * @param callback A function that defines the condition.
   */
  async deleteMany(
    table: string,
    callback: (
      entry: { key: string; value: V },
      index: number,
    ) => boolean | Promise<boolean>,
  ) {
    let entries: string[] = [];
    const allEntries = Object.entries(await this.all(table));

    for (let i = 0; i < allEntries.length; i++) {
      const [key, value] = allEntries[i];
      const entry = { key, value, index: i };

      if (await callback(entry, i)) {
        entries.push(key);
      }
    }

    await this.delete(table, entries);
  }

  /**
   * Deletes key-value pairs from the specified table with the given key(s).
   * @param table The name of the table.
   * @param key The key or array of keys to delete.
   */
  async delete(table: string, key: string | string[]) {
    let data = await this.getData(table);
    const keys = Array.isArray(key) ? key : [key];
    this.emit("delete", {
      table,
      variable: key,
      data: !Array.isArray(key)
        ? data[key].value
        : [...key].map((key) => data[key].value),
    });
    keys.forEach((key) => delete data[key]);
    await this.setData(table, data);
  }

  /**
   * Deletes all key-value pairs from the specified table.
   * @param table The name of the table.
   */
  async clear(table: string) {
    const keys = await this.all(table);
    await this.setData(table, {});
    this.emit("deleteAll", { table, variables: keys });
  }

  /**
   * Converts data from a specified table to JSON format and writes it to a file.
   * @param table - The name of the table to convert.
   * @param filePath - The file path to write the JSON data.
   */
  async convertFileToTable(table: string, filePath: string) {
    if (!filePath) {
      throw new Error("The 'filePath' parameter is not specified");
    }

    /**
     * Reads data from a file and parses it into JSON format.
     */
    const readFileParseJSON = async (filePath: string) => {
      try {
        const stream = createReadStream(filePath);
        const buffer = await getStream.buffer(stream);
        const fileData = buffer.toString()
          ? buffer.toString()
          : await getStream.buffer(createReadStream(filePath));
        return JSON.parse(fileData as unknown as string);
      } catch (err) {
        console.log(err);
        return {};
      }
    };

    const fileData = await readFileParseJSON(filePath);
    const fileEntries = Object.entries(fileData) as unknown as {
      key: string;
      value: any;
    }[][];
    for (const data of fileEntries) {
      await this.set(table, `${data[1].key}`, data[1].value);
    }
  }

  /**
   * Converts data from a specified table to JSON format and writes it to a file.
   * @param table - The name of the table to convert.
   * @param filePath - The file path to write the JSON data.
   */
  async convertTableToFile(table: string, filePath: string) {
    if (!filePath) {
      throw new Error("The 'filePath' parameter is not specified");
    }

    const data = await this.getData(table);
    createWriteStream(filePath).write(JSON.stringify(data));
  }

  /**
   * Pings the storage database to check responsiveness.
   * @returns The time taken in milliseconds to retrieve data from all tables.
   */
  async ping() {
    const start = Date.now();
    this.options.tables.forEach(async (table) => await this.all(table));
    return Date.now() - start;
  }

  /**
   * Connects to the storage database.
   * Initializes data files for tables and emits "ready" event upon successful connection.
   * @returns This instance for chaining.
   */
  async connect() {
    const { path, tables, extname } = this.options;
    for (const table of tables) {
      const tablePath = join(process.cwd(), path, table);
      const filePath = join(tablePath, `storage${extname}`);

      await fs.mkdir(tablePath, { recursive: true });

      try {
        await fs.access(filePath, fs.constants.F_OK);
      } catch (err) {
        await fs.writeFile(filePath, "{}");
      }
    }
    this.#isReady = true;
    this.emit("ready", this);
  }
}

export { StorageDB, StorageDBOptions };
