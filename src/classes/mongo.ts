import fs from "node:fs/promises";
import getStream from "get-stream";
import { createReadStream, createWriteStream } from "node:fs";
import {
  type MongoClientOptions,
  MongoClient,
  ServerApiVersion,
} from "mongodb";
import { ManagerEvents } from "./events";
import { deepEqualTry } from "../utils";

type MongoDBOptions = MongoClientOptions & { tables?: string[] };

/**
 * Represents a generic MongoDB manager.
 * @typeparam V The type of values stored in the database.
 */
class MongoDB<V> extends ManagerEvents<V, MongoDB<V>> {
  #isReady: boolean = false;
  public readonly tables: string[];
  public client: MongoClient = null as unknown as MongoClient;

  /**
   * Constructs a new MongoDB instance.
   * @param url The URL of the MongoDB database.
   * @param options Additional options for MongoDB initialization, including tables.
   */
  constructor(
    public readonly url: string,
    public readonly options?: MongoClientOptions & { tables?: string[] },
  ) {
    super();
    this.tables = options?.tables || ["main"];
  }

  /**
   * Checks if the specified table exists.
   * @param tableName The name of the table to check.
   * @throws Error if the database is not ready or the table does not exist.
   */
  private hasTable(tableName: string) {
    if (!this.#isReady) {
      throw new Error(
        'After employing the techniques, incinerate the class utilizing the "<MongoDB>.connect" method',
      );
    }

    if (this.tables.findIndex((table) => table === tableName) === -1) {
      throw new Error(`The specified table "${tableName}" is not available`);
    }
  }

  /**
   * Retrieves a value from the specified table with the given key.
   * @param table The name of the table.
   * @param key The key of the value to retrieve.
   * @returns The value associated with the key, if found; otherwise, undefined.
   */
  async get(table: string, key: string): Promise<V | undefined> {
    this.hasTable(table);
    const collection = await this.client.db(table).collection(key);
    const findKey = await collection.findOne({ _k: key });
    return findKey?._v;
  }

  /**
   * Sets a value in the specified table with the given key.
   * Emits "create" event if the key does not exist, and "update" event if the key already exists and value changes.
   * @param table The name of the table.
   * @param key The key of the value to set.
   * @param value The value to set.
   * @returns This instance for chaining.
   */
  async set(table: string, key: string, value: V) {
    this.hasTable(table);
    const collection = await this.client.db(table).collection(key);
    const oldData = (await this.get(table, key)) as V;

    if (!((await collection.countDocuments()) > 0)) {
      this.emit("create", {
        table,
        variable: key,
        data: value,
      });
    } else if (!deepEqualTry(value, oldData)) {
      this.emit("update", {
        table,
        variable: key,
        newData: value,
        oldData,
      });
    }

    await collection.updateOne(
      { _k: key },
      { $set: { _v: value, _k: key } },
      { upsert: true },
    );
    return this;
  }

  /**
   * Checks if a value with the specified key exists in the table.
   * @param table The name of the table.
   * @param key The key to check for existence.
   * @returns True if the key exists, false otherwise.
   */
  async has(table: string, key: string) {
    this.hasTable(table);
    const collection = await this.client.db(table).collection(key);
    return (await collection.countDocuments()) > 0;
  }

  /**
   * Retrieves all key-value pairs from the specified table.
   * @param table The name of the table.
   * @returns An object containing all key-value pairs in the table.
   */
  async all(table: string) {
    this.hasTable(table);
    const collection = await this.client.db(table).collections();
    let allDocuments = await Promise.all(
      collection.map(async (res) => await res.findOne({})),
    );

    const allData: { [key: string]: V } = {};

    for (const document of allDocuments) {
      if (document) {
        allData[document._k] = document._v;
      }
    }

    return allData;
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
      entry: {
        key: string;
        value: V;
      },
      index: number,
    ) => boolean | Promise<boolean>,
  ) {
    this.hasTable(table);
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
      entry: {
        key: string;
        value: V;
      },
      index: number,
    ) => boolean | Promise<boolean>,
  ) {
    this.hasTable(table);
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
      entry: {
        key: string;
        value: V;
      },
      index: number,
    ) => boolean | Promise<boolean>,
  ) {
    this.hasTable(table);
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
    this.hasTable(table);
    const keys = Array.isArray(key) ? key : [key];

    for (const k of keys) {
      const collection = await this.client.db(table).collection(k);
      const oldData = (await this.get(table, k)) as V;

      await collection.deleteOne({ _k: k }).then(() =>
        this.emit("delete", {
          table,
          variable: k,
          data: oldData,
        }),
      );
    }
  }

  /**
   * Deletes all key-value pairs from the specified table.
   * @param table The name of the table.
   */
  async clear(table: string) {
    this.hasTable(table);
    const keys = await this.all(table);
    for (const k of Object.keys(keys)) {
      const collection = await this.client.db(table).collection(k);

      await collection.deleteOne({ _k: k });
    }
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

    const tableData = await this.all(table);

    let database: { [key: string]: any } = {};

    Object.entries(tableData).forEach(([key, value]) => {
      database[key] = { key, value };
    });

    createWriteStream(filePath).write(JSON.stringify(database));
  }

  /**
   * Pings the MongoDB database to check responsiveness.
   * @returns The time taken in milliseconds to retrieve data from all tables.
   */
  async ping() {
    const start = Date.now();
    this.tables.forEach(async (table) => await this.all(table));
    return Date.now() - start;
  }

  /**
   * Connects to the MongoDB database.
   * Initializes MongoDB client instance and emits "ready" event upon successful connection.
   * @returns This instance for chaining.
   */
  async connect() {
    this.client = new MongoClient(this.url, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: false,
      },
      ...this.options,
    });
    await this.client.connect().then(() => {
      this.#isReady = true;
      this.emit("ready", this);
    });
  }
}

export { MongoDB, MongoDBOptions };
