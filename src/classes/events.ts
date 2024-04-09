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
  on<T extends keyof IEventDataMap<Value, Class>>(
    eventName: T,
    listener: (args: IEventDataMap<Value, Class>[T]) => unknown,
  ): this;

  /**
   * Overloaded implementation of the on method.
   */
  on(
    eventName: keyof IEventDataMap<Value, Class>,
    listener: (args: IEventDataMap<Value, Class>[typeof eventName]) => unknown,
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
  once<T extends keyof IEventDataMap<Value, Class>>(
    eventName: T,
    listener: (args: IEventDataMap<Value, Class>[T]) => unknown,
  ): this;

  /**
   * Overloaded implementation of the once method.
   */
  once(
    eventName: keyof IEventDataMap<Value, Class>,
    listener: (args: IEventDataMap<Value, Class>[typeof eventName]) => unknown,
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
  off<T extends keyof IEventDataMap<Value, Class>>(
    eventName: T,
    listener: (args: IEventDataMap<Value, Class>[T]) => unknown,
  ): this;

  /**
   * Overloaded implementation of the off method.
   */
  off(
    eventName: keyof IEventDataMap<Value, Class>,
    listener: (args: IEventDataMap<Value, Class>[typeof eventName]) => unknown,
  ) {
    super.once(eventName, listener);
    return this;
  }

  /**
   * Emits the specified event with the provided data.
   * @param eventName The name of the event to emit.
   * @param eventData The data associated with the event.
   * @returns A boolean indicating whether the event had listeners.
   */
  emit<T extends keyof IEventDataMap<Value, Class>>(
    eventName: T,
    eventData: IEventDataMap<Value, Class>[T],
  ): boolean;

  /**
   * Overloaded implementation of the emit method.
   */
  emit(
    eventName: keyof IEventDataMap<Value, Class>,
    eventData: IEventDataMap<Value, Class>[typeof eventName],
  ) {
    return super.emit(eventName, eventData);
  }
}

export { ManagerEvents };
