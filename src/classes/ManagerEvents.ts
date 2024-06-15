import { EventEmitter } from "node:events";
import type { IEventDataMap } from "../typing";

/**
 * Represents a generic event manager that extends EventEmitter.
 * @typeparam Value The type of values associated with events.
 * @typeparam Class The class type for events.
 */
class ManagerEvents<Value, Class> extends EventEmitter {
  /**
   * Constructs a new ManagerEvents instance.
   */
  constructor() {
    super();
  }

  /**
   * Registers a listener for the specified event.
   * @param eventName The name of the event to listen for.
   * @param listener The callback function to invoke when the event occurs.
   * @returns This instance for chaining.
   */
  on(eventName: string, listener: (...args: any[]) => void): this;

  /**
   * Registers a listener for the specified event.
   * @param eventName The name of the event to listen for.
   * @param listener The callback function to invoke when the event occurs.
   * @returns This instance for chaining.
   */
  on<T extends keyof IEventDataMap<Value, Class>>(
    eventName: T,
    listener: (args: IEventDataMap<Value, Class>[T]) => void,
  ): this;

  /**
   * Registers a listener for the specified event.
   * @param eventName The name of the event to listen for.
   * @param listener The callback function to invoke when the event occurs.
   * @returns This instance for chaining.
   */
  on(
    eventName: keyof IEventDataMap<Value, Class>,
    listener: (args: IEventDataMap<Value, Class>[typeof eventName]) => void,
  ) {
    super.on(eventName, listener);
    return this;
  }

  /**
   * Registers a one-time listener for the specified event.
   * @param eventName The name of the event to listen for.
   * @param listener The callback function to invoke when the event occurs.
   * @returns This instance for chaining.
   */
  once(eventName: string, listener: (...args: any[]) => void): this;

  /**
   * Registers a one-time listener for the specified event.
   * @param eventName The name of the event to listen for.
   * @param listener The callback function to invoke when the event occurs.
   * @returns This instance for chaining.
   */
  once<T extends keyof IEventDataMap<Value, Class>>(
    eventName: T,
    listener: (args: IEventDataMap<Value, Class>[T]) => void,
  ): this;

  /**
   * Registers a one-time listener for the specified event.
   * @param eventName The name of the event to listen for.
   * @param listener The callback function to invoke when the event occurs.
   * @returns This instance for chaining.
   */
  once(
    eventName: keyof IEventDataMap<Value, Class>,
    listener: (args: IEventDataMap<Value, Class>[typeof eventName]) => void,
  ) {
    super.once(eventName, listener);
    return this;
  }

  /**
   * Removes a listener for the specified event.
   * @param eventName The name of the event.
   * @param listener The callback function to remove from the event.
   * @returns This instance for chaining.
   */
  off(eventName: string, listener: (...args: any[]) => void): this;

  /**
   * Removes a listener for the specified event.
   * @param eventName The name of the event.
   * @param listener The callback function to remove from the event.
   * @returns This instance for chaining.
   */
  off<T extends keyof IEventDataMap<Value, Class>>(
    eventName: T,
    listener: (args: IEventDataMap<Value, Class>[T]) => void,
  ): this;

  /**
   * Removes a listener for the specified event.
   * @param eventName The name of the event.
   * @param listener The callback function to remove from the event.
   * @returns This instance for chaining.
   */
  off(
    eventName: keyof IEventDataMap<Value, Class>,
    listener: (args: IEventDataMap<Value, Class>[typeof eventName]) => void,
  ) {
    super.once(eventName, listener);
    return this;
  }
}

export { ManagerEvents };
