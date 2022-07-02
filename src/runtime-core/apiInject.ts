import { getCurrentInstance } from "./component";

export function provide(key, value) {
  console.log(key, value);
  const instance = getCurrentInstance();

  if (instance) {
    const { provides } = instance as any;

    provides[key] = value;
  }
}

export function inject(key, defaultValue) {
  console.log(key);
  const instance: any = getCurrentInstance();
  const parentProvides = instance.parent.provides;

  if (key in parentProvides) {
    return parentProvides[key];
  } else {
    if (typeof defaultValue === "function") {
      return defaultValue();
    } else {
      return defaultValue;
    }
  }
}
