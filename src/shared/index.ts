export const extend = Object.assign;

export function isObject(value) {
  return value !== null && typeof value === "object";
}

export const hasChanged = (val, newValue) => {
  return !Object.is(val, newValue);
}
