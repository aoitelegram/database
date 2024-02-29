import { deepEqual } from "node:assert";

function deepEqualTry(actual: unknown, expected: unknown) {
  try {
    deepEqualTry(actual, expected);
    return true;
  } catch (error) {
    return false;
  }
}

export { deepEqualTry };
