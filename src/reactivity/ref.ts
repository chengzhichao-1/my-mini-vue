import { hasChanged, isObject } from "../shared";
import { trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value;
  private _rawValue
  private dep;
  constructor(value) {
    this._rawValue = value
    this._value = convert(value);
    this.dep = new Set()
  }

  get value() {
    trackEffects(this.dep);
    return this._value;
  }

  set value(newValue) {
    if (hasChanged(this._rawValue, newValue)) {
      this._rawValue = newValue;
      this._value = convert(newValue);
      triggerEffects(this.dep);
    }
  }
}

export function ref(value) {
  return new RefImpl(value);
}

function convert(value) {
  return isObject(value) ? reactive(value) : value;
}
