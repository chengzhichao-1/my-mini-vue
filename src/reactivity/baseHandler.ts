import { extend, isObject } from "../shared";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags, readonly } from "./reactive";

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    const res = Reflect.get(target, key, receiver);

    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    
    if (shallow) {
      return res
    }

    if (!isReadonly) {
      track(target, key);
    }

    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res;
  };
}

function createSetter() {
  return function set(target, key, value, receiver) {
    const res = Reflect.set(target, key, value, receiver);
    trigger(target, key);
    return res;
  };
}
export const mutableHandlers = {
  get,
  set,
};

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(
      `key: "${String(key)}" set失败，因为target是readonly类型`,
      target
    );
    return true;
  },
};

export const shallowHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet
})