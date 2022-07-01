export const extend = Object.assign;

export function isObject(value) {
  return value !== null && typeof value === "object";
}

export const hasChanged = (val, newValue) => {
  return !Object.is(val, newValue);
};

export const hasOwn = (target, key) => {
  return Object.prototype.hasOwnProperty.call(target, key);
};
