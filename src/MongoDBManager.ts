import { CustomError } from "./Error";
import { EventEmitter } from "node:events";
import { MongoClient, ServerApiVersion } from "mongodb";

function at<T extends unknown[]>(arr: T, index: number) {
  return index >= 1 ? arr[index] : arr[arr.length + index];
}

interface MongoDBEventData<K, V> {
  create: {
    table: string;
    variable: string;
    data: V | undefined;
  };
  update: {
    table: string;
    variable: string;
    newData: V | undefined;
    oldData: V | undefined;
  };
  delete: {
    table: string;
    variable: string;
    data: V | undefined;
  };
  deleteAll: {
    table: string;
    variables: { [key: string]: V }[];
  };
  ready: MongoDBManager<K, V>;
}

interface MongoDBResultOne<K, V> {
  _k: K;
  variable: K;
  _v: V;
  value: V;
}

/**
 * Represents a MongoDB manager with event handling capabilities.
 * @extends EventEmitter
 * @template K - Type of keys
 * @template V - Type of values
 */
class MongoDBManager<K, V> extends EventEmitter {
  client: MongoClient;

  /**
   * Constructs a new MongoDBManager instance.
   * @param url - MongoDB connection URL
   */
  constructor(url: string) {
    super();
    this.client = new MongoClient(url, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: false,
      },
    });
    this.connect();
  }

  /**
   * Adds an event listener for the specified event.
   * @template T - Type of event
   * @param {T} event - Event name
   * @param {Function} listener - Event listener function
   * @returns {this} The current MongoDBManager instance
   * @override
   */
  on<T extends keyof MongoDBEventData<K, V>>(
    event: T,
    listener: (data: MongoDBEventData<K, V>[T]) => void,
  ): this;

  /**
   * Adds an event listener for the specified event.
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   * @returns {this} The current MongoDBManager instance
   * @override
   */
  on(
    event: keyof MongoDBEventData<K, V>,
    listener: (args1: MongoDBEventData<K, V>[typeof event]) => void,
  ) {
    super.on(event, listener);
    return this;
  }

  /**
   * Retrieves data from a MongoDB collection.
   * @param table - Name of the MongoDB collection
   * @param  variable - Name of the document in the collection
   * @returns  The data stored in the document
   */
  async get(table: string, variable: string) {
    const result = await this.client.db(table).collection(variable);
    const findKey = await result.findOne(
      { _k: variable },
      { projection: { _v: 1, _id: 0 } },
    );
    return findKey ? (findKey._v as V) : undefined;
  }

  /**
   * Sets data for a specific variable in a MongoDB collection.
   * @param  table - Name of the MongoDB collection
   * @param  variable - Name of the document in the collection
   * @param  data - Data to be set
   */
  async set(table: string, variable: string, data: V) {
    const collection = this.client.db(table).collection(variable);
    const oldValue = await this.get(table, variable);

    await collection.updateOne(
      { _k: variable },
      { $set: { _v: data, _k: variable } },
      { upsert: true },
    );

    const newValue = data;
    if (await this.has(table, variable as K)) {
      this.emit(
        "update",
        { table, variable, newData: newValue, oldData: oldValue },
        undefined,
      );
    } else {
      this.emit("create", { table, variable, data: newValue }, undefined);
    }
  }

  /**
   * Clears data in a specific variable of a MongoDB collection.
   * @param  table - Name of the MongoDB collection
   * @param  variable - Name of the document in the collection
   * @param  oldValues - Whether to return the old values
   * @returns  The deleted data, or undefined if not found
   */
  async delete(table: string, variable: string, oldValues = false) {
    const collection = this.client.db(table).collection(variable);
    const values = await this.get(table, variable);

    await collection.deleteOne({ _k: variable });
    this.emit("delete", { table, variable, data: values }, undefined);

    if (oldValues) {
      return values;
    }
  }

  /**
   * Retrieves all variable-value pairs in a specified table.
   * @param  table - Name of the MongoDB collection
   * @returns All variable-value pairs in the collection
   */
  async all(table: string): Promise<{ [variable: string]: V }> {
    const collection = await this.client.db(table).collections();
    let allDocuments = (await Promise.all(
      collection.map(async (res) => await res.findOne({})),
    )) as unknown as MongoDBResultOne<K, V>[];

    allDocuments = allDocuments.map((res) =>
      res ? { variable: res._k, value: res._v } : {},
    ) as unknown as MongoDBResultOne<K, V>[];

    const allData: { [variable: string]: V } = {};
    allDocuments.forEach((document) => {
      const variable = document?.variable;
      const value = document?.value;

      if (variable) {
        allData[String(variable)] = value;
      }
    });

    return allData;
  }

  /**
   * Clears all data in a specific MongoDB collection.
   * @param  table - Name of the MongoDB collection
   */
  async clear(table: string) {
    const collections = await this.client.db(table).collections();

    this.emit(
      "deleteAll",
      { table, variables: await this.all(table) },
      undefined,
    );

    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }

  /**
   * Checks if a variable exists in a specific MongoDB collection.
   * @param  table - Name of the MongoDB collection
   * @param  variable - Name of the document in the collection
   * @returns  True if the variable exists, false otherwise
   */
  async has(table: string, variable: K) {
    const result = await this.client.db(table).collection(String(variable));
    return (await result.countDocuments()) > 0;
  }

  /**
   * Iterates over all variable-value pairs in a specified table and executes a callback function.
   * @param  table - Name of the table
   * @param  callback - Callback function to execute for each variable-value pair
   */
  async forEach(
    table: string,
    callback: (value: V, variable: K, db: { [variable: string]: V }) => void,
  ) {
    const db = await this.all(table);
    for (const variable of Object.keys(db)) {
      const value = db[variable];
      await callback(value, variable as K, db);
    }
  }

  /**
   * Retrieves a specific variable-value pair from a specified table.
   * @param  table - Name of the table
   * @param  variable - Key to retrieve
   * @returns  The variable-value pair, or undefined if not found
   */
  async filter(
    table: string,
    filterFn: (value: V, variable: K, db: { [variable: string]: V }) => boolean,
  ) {
    const db = await this.all(table);
    const filteredEntries: [K, V][] = [];

    for (const variable of Object.keys(db)) {
      const value = db[variable];
      if (filterFn(value, variable as K, db)) {
        filteredEntries.push([variable as K, value]);
      }
    }

    return filteredEntries;
  }

  /**
   * Retrieves a specific variable-value pair from a specified table.
   * @param  table - Name of the table
   * @param  variable - Key to retrieve
   * @returns  The variable-value pair, or undefined if not found
   */
  async at(table: string, variable: K) {
    const db = await this.all(table);
    if (await this.has(table, variable)) {
      return db[String(variable)];
    } else if (typeof variable === "number") {
      let res: any[] = [];
      for (const variable in db) {
        const value = db[variable];
        res.push({ variable, value });
      }
      return at(res, variable) as { K: V };
    }
  }

  /**
   * Retrieves a random variable-value pair from a specified table.
   * @param  table - Name of the table
   * @returns  A random value, or undefined if the table is empty
   */
  async randomAt(table: string) {
    const db = await this.all(table);
    const keys = Object.keys(db);
    if (keys.length === 0) return undefined;
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return db[randomKey];
  }

  /**
   * Retrieves all keys from a specified table.
   * @param  table - Name of the table
   * @returns  Array of keys in the table
   */
  async keys(table: string) {
    const db = await this.all(table);
    let res: K[] = [];
    for (const variable of Object.keys(db)) {
      res.push(variable as K);
    }
    return res;
  }

  /**
   * Retrieves all values from a specified table.
   * @param  table - Name of the table
   * @returns  Array of values in the table
   */
  async values(table: string) {
    const db = await this.all(table);
    let res: V[] = [];
    for (const variable of Object.keys(db)) {
      res.push(db[variable]);
    }
    return res;
  }

  /**
   * Retrieves the length of variable-value pairs in a specified table.
   * @param  table - Name of the table.
   * @returns Object containing variable and value counts.
   */
  async length(table: string) {
    const variable = await this.keys(table);
    const value = await this.values(table);
    return { variable: variable.length, value: value.length };
  }

  /**
   * Establishes a connection and emits a 'ready' event.
   * @emits ready - Emitted when the MongoDBManager instance is ready.
   */
  async connect() {
    await this.client.connect();
    this.emit("ready", this);
  }

  /**
   * Closes the MongoDB connection.
   */
  async close() {
    await this.client.close();
  }
}

export { MongoDBManager };
