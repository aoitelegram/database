import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { cipher, decoding } from "./Util";
import { CustomError } from "./Error";

function keys<T extends Object>(obj: T) {
  if (typeof obj === "object") return Object.keys(obj);
  else return [];
}

function valuess<T extends Object>(obj: T) {
  if (typeof obj === "object") return Object.values(obj);
  else return [];
}

function at<T extends unknown[]>(arr: T, index: number) {
  return index >= 1 ? arr[index] : arr[arr.length + index];
}

interface EventDataMap<K, V> {
  create: {
    tables: string[];
    path: string;
    extname: string;
    key: K;
    value: V | undefined;
  };
  update: {
    tables: string[];
    path: string;
    extname: string;
    key: K;
    value: V | undefined;
  };
  delete: {
    tables: string[];
    path: string;
    extname: string;
    key: K;
    value: V | undefined;
  };
  deleteAll: {
    tables: string[];
    path: string;
    extname: string;
    value: { K: V };
  };
  ready: KeyValue<K, V>;
}

interface EventDataMap2<K, V> {
  create: undefined;
  update: {
    tables: string[];
    path: string;
    extname: string;
    key: K;
    value: V | undefined;
  };
  delete: undefined;
  deleteAll: undefined;
  ready: undefined;
}

/**
 * Represents a key-value store with event handling capabilities.
 * @extends EventEmitter
 * @template K - Type of keys
 * @template V - Type of values
 */
class KeyValue<K, V> extends EventEmitter {
  /**
   * Path where the database is stored.
   */
  path: string;

  /**
   * Array of table names in the database.
   */
  tables: string[];

  /**
   * File extension for table storage files.
   */
  extname: string;

  /**
   * Constructs a new KeyValue instance.
   * @param {Object} options - Configuration options for KeyValue.
   * @param {string} options.path - Path where the database is stored.
   * @param {string[]} options.tables - Array of table names in the database.
   * @param {string} options.extname - File extension for table storage files.
   */
  constructor(
    options: {
      path?: string;
      tables?: string[];
      extname?: string;
    } = {},
  ) {
    super();
    this.path = options.path ?? "database";
    this.tables = options.tables ?? ["main"];
    this.extname = options.extname ?? ".sql";

    const existsPath = path.join(process.cwd(), this.path);
    if (!fs.existsSync(existsPath)) {
      fs.mkdirSync(existsPath);
    }

    let tableFile: string[] = this.tables;
    if (!Array.isArray(tableFile)) {
      throw new CustomError("Invalid table array", "ErrorTable");
    }
    if (!this.extname) {
      throw new CustomError("Invalid extension", "ErrorExtension");
    }

    for (const table of this.tables) this.#initializeTable(table);
  }

  /**
   * Adds an event listener for the specified event.
   * @template T - Type of event
   * @param {T} event - Event name
   * @param {Function} listener - Event listener function
   * @returns {this} The current KeyValue instance
   * @override
   */
  on<T extends keyof EventDataMap<K, V>>(
    event: T,
    listener: (
      data: EventDataMap<K, V>[T],
      data2: EventDataMap2<K, V>[T],
    ) => void,
  ): this;

  /**
   * Adds an event listener for the specified event.
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   * @returns {this} The current KeyValue instance
   * @override
   */
  on(
    event: keyof EventDataMap<K, V>,
    listener: (
      args1: EventDataMap<K, V>[typeof event],
      args2: EventDataMap2<K, V>[typeof event],
    ) => void,
  ): this {
    super.on(event, listener);
    return this;
  }

  /**
   * Initializes a table by creating its storage file if it doesn't exist.
   * @private
   * @param {string} table - Name of the table to initialize
   */
  #initializeTable(table: string) {
    const tablePath = path.join(process.cwd(), this.path, table);
    const filePath = path.join(tablePath, `storage${this.extname}`);

    if (!fs.existsSync(tablePath)) {
      fs.mkdirSync(tablePath);
    }

    if (!fs.existsSync(filePath)) {
      const fileDescriptor = fs.openSync(filePath, "w");
      fs.writeFileSync(fileDescriptor, "{}");
      fs.closeSync(fileDescriptor);
    }
  }

  /**
   * Retrieves data from a table storage file.
   * @private
   * @param {string} tableName - Name of the table
   * @param {string} directory - Directory where the table is stored
   * @param {string} fileExtension - File extension for table storage files
   * @returns {Object} The data stored in the table
   */
  #getTableData(tableName: string, directory: string, fileExtension: string) {
    const filePath = path.join(
      process.cwd(),
      directory,
      tableName,
      `storage${fileExtension}`,
    );
    let fileDescriptor;

    try {
      fileDescriptor = fs.openSync(filePath, "r");
      const data = fs.readFileSync(filePath, "utf8");

      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading file:", error);
      return {};
    } finally {
      if (fileDescriptor) {
        fs.closeSync(fileDescriptor);
      }
    }
  }

  /**
   * Sets data for a specific key in a table.
   * @private
   * @param {string} tableName - Name of the table
   * @param {string} directory - Directory where the table is stored
   * @param {unknown} data - Data to be set
   * @param {string} fileExtension - File extension for table storage files
   */
  #setTableData(
    tableName: string,
    directory: string,
    data: unknown,
    fileExtension: string,
  ) {
    const content = JSON.stringify(data);
    const filePath = path.join(
      process.cwd(),
      directory,
      tableName,
      `storage${fileExtension}`,
    );
    let fileDescriptor;

    try {
      fileDescriptor = fs.openSync(filePath, "w");
      fs.writeFileSync(fileDescriptor, content);
    } catch (error) {
      console.error("Error writing file:", error);
    } finally {
      if (fileDescriptor) {
        fs.closeSync(fileDescriptor);
      }
    }
  }

  /**
   * Checks if a table exists; throws an error if it doesn't.
   * @private
   * @param {string} table - Name of the table to check
   * @throws {CustomError} If the table doesn't exist
   */
  #hasTable(table: string) {
    if (!this.hasTable(table)) {
      throw new CustomError(`Invalid table name: ${table}`, "ErrorTable");
    }
  }

  /**
   * Sets a key-value pair in a specified table.
   * @param {string} table - Name of the table
   * @param {K} key - Key to set
   * @param {V} value - Value to set
   * @returns {this} The current KeyValue instance
   * @emits {update} When a key-value pair is updated
   */
  set(table: string, key: K, value: V) {
    this.#hasTable(table);
    const getValue = this.get(table, key);
    let db = this.#getTableData(table, this.path, this.extname);
    db[key] = new Object({
      key,
      value,
    });
    const newValue = {
      tables: table,
      path: this.path,
      extname: this.extname,
      key,
      value,
    };
    const oldValue = {
      tables: table,
      path: this.path,
      extname: this.extname,
      key,
      value: getValue,
    };
    if (!this.has(table, key)) {
      this.emit("create", newValue);
    }
    if (this.has(table, key)) {
      this.emit("update", newValue, oldValue);
    }
    this.#setTableData(table, this.path, db, this.extname);
    return this;
  }

  /**
   * Retrieves the value associated with a key in a specified table.
   * @param {string} table - Name of the table
   * @param {K} key - Key to retrieve
   * @returns {V | undefined} The value associated with the key, or undefined if not found
   */
  get(table: string, key: K): V | undefined {
    this.#hasTable(table);
    let db = this.#getTableData(table, this.path, this.extname);
    if (this.has(table, key)) {
      let values = db[key]["value"];
      return values;
    } else {
      return undefined;
    }
  }

  /**
   * Retrieves all key-value pairs in a specified table.
   * @param {string} table - Name of the table
   * @returns {Object} All key-value pairs in the table
   */
  all(table: string): { K: V } {
    this.#hasTable(table);
    let db = this.#getTableData(table, this.path, this.extname);
    return db;
  }

  /**
   * Clears all key-value pairs in a specified table.
   * @param {string} table - Name of the table
   * @returns {this} The current KeyValue instance
   * @emits {deleteAll} When all key-value pairs in the table are deleted
   */
  delete(table: string, key: K, oldValues = false): void | V {
    this.#hasTable(table);
    let db = this.#getTableData(table, this.path, this.extname);
    let values = this.get(table, key);
    const oldValue = {
      tables: table,
      path: this.path,
      extname: this.extname,
      key: key,
      value: values,
    };
    delete db[key];
    this.#setTableData(table, this.path, db, this.extname);
    this.emit("delete", oldValue);
    if (oldValues) {
      return values;
    }
  }

  /**
   * Clears all key-value pairs in a specified table.
   * @param {string} table - Name of the table
   * @returns {this} The current KeyValue instance
   * @emits {deleteAll} When all key-value pairs in the table are deleted
   */
  clear(table: string) {
    this.#hasTable(table);
    let db = {};
    const oldValue = {
      tables: table,
      path: this.path,
      extname: this.extname,
      value: this.all(table),
    };
    this.#setTableData(table, this.path, db, this.extname);
    this.emit("deleteAll", oldValue);
    return this;
  }

  /**
   * Checks if a key exists in a specified table.
   * @param {string} table - Name of the table
   * @param {K} key - Key to check
   * @returns {boolean} True if the key exists, false otherwise
   */
  has(table: string, key: K) {
    this.#hasTable(table);
    let db = this.#getTableData(table, this.path, this.extname);
    return db[key] === undefined ? false : true;
  }

  /**
   * Iterates over all key-value pairs in a specified table and executes a callback function.
   * @param {string} table - Name of the table
   * @param {Function} callback - Callback function to execute for each key-value pair
   */
  forEach(table: string, callback: (value: V, key: K, db: any) => void) {
    this.#hasTable(table);
    const db = this.#getTableData(table, this.path, this.extname);
    for (const key in db) {
      const value = db[key].value;
      callback(value, key as K, db);
    }
  }

  /**
   * Retrieves a specific key-value pair from a specified table.
   * @param {string} table - Name of the table
   * @param {K} key - Key to retrieve
   * @returns {Object | undefined} The key-value pair, or undefined if not found
   */
  filter(table: string, filterFn: (value: V, key: K, db: any) => boolean) {
    this.#hasTable(table);
    const db = this.#getTableData(table, this.path, this.extname);
    const filteredEntries: [K, V][] = [];

    for (const key in db) {
      const value = db[key].value;
      if (filterFn(value, key as K, db)) {
        filteredEntries.push([key as K, value]);
      }
    }

    return filteredEntries;
  }

  /**
   * Retrieves a specific key-value pair from a specified table.
   * @param {string} table - Name of the table
   * @param {K} key - Key to retrieve
   * @returns {Object | undefined} The key-value pair, or undefined if not found
   */
  at(table: string, key: K): { K: V } | undefined {
    this.#hasTable(table);
    const db = this.#getTableData(table, this.path, this.extname);
    if (db[key]?.value !== undefined) {
      return db[key]?.value;
    } else if (typeof key === "number") {
      let res: any[] = [];
      for (const key in db) {
        const value = db[key]?.value;
        res.push({ key, value });
      }
      return at(res, key) as { K: V };
    }
  }

  /**
   * Retrieves a random key-value pair from a specified table.
   * @param {string} table - Name of the table
   * @returns {V | undefined} A random value, or undefined if the table is empty
   */
  randomAt(table: string): V | undefined {
    this.#hasTable(table);
    const db = this.#getTableData(table, this.path, this.extname);
    const keys = Object.keys(db);
    if (keys.length === 0) return undefined;
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return db[randomKey]?.value;
  }

  /**
   * Retrieves all keys from a specified table.
   * @param {string} table - Name of the table
   * @returns {Array<K>} Array of keys in the table
   */
  keys(table: string) {
    this.#hasTable(table);
    const db = this.#getTableData(table, this.path, this.extname);
    let res: K[] = [];
    for (const key in db) {
      res.push(key as K);
    }
    return res;
  }

  /**
   * Retrieves all values from a specified table.
   * @param {string} table - Name of the table
   * @returns {Array<V>} Array of values in the table
   */
  values(table: string) {
    this.#hasTable(table);
    const db = this.#getTableData(table, this.path, this.extname);
    let res: V[] = [];
    for (const key in db) {
      res.push(db[key].value);
    }
    return res;
  }

  /**
   * Retrieves the length of key-value pairs in a specified table.
   * @param {string} table - Name of the table.
   * @returns {{ key: number, value: number }} - Object containing key and value counts.
   */
  length(table: string) {
    const key = this.keys(table);
    const value = this.values(table);
    return { key: key.length, value: value.length };
  }

  /**
   * Checks if a table exists.
   * @param {string} tableName - Name of the table to check.
   * @returns {boolean} - True if the table exists, otherwise false.
   */
  hasTable(tableName: string) {
    return this.tables.includes(tableName);
  }

  /**
   * Checks if a given string is a valid table name.
   * @param {string} table - Name of the table to check.
   * @returns {boolean} - True if it's a valid table, otherwise false.
   */
  isTable(table: string): boolean {
    return this.tables.find((a) => a === table) === undefined ? false : true;
  }

  /**
   * Establishes a connection and emits a 'ready' event.
   * @emits ready - Emitted when the KeyValue instance is ready.
   */
  connect(): void {
    this.emit("ready", this);
  }
}

export { KeyValue };
