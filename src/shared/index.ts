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

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const camelize = (str: string) => {
  return str.replace(/-([a-zA-Z])/g, (_, c: string) => {
    return c ? c.toUpperCase() : "";
  });
};

export const toHandlerKey = (str: string) => {
  return str ? "on" + capitalize(str) : "";
};
