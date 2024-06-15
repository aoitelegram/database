import { deepEqual } from "node:assert";

function deepEqualTry(actual: unknown, expected: unknown) {
  try {
    deepEqual(actual, expected);
    return true;
  } catch (error) {
    return false;
  }
}

export { deepEqualTry };
