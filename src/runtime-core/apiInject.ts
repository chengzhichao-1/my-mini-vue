import { getCurrentInstance } from "./component";

export function provide(key, value) {
  const instance = getCurrentInstance();

  if (instance) {
    const { provides } = instance as any;

    provides[key] = value;
  }
}

export function inject(key, defaultValue) {
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
