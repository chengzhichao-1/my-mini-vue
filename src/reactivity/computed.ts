import { ReactiveEffect } from "./effect";

class computedRefImpl {
  private _effect;
  private _value;
  private _dirty = true;
  constructor(getter) {
    // 巧妙利用scheduler 当computed中的响应式对象被set -> trigger触发依赖 -> 触发scheduler -> 修改_dirty为true -> 下一次不会用缓存而是重新调用依赖
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }

  get value() {
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }

    return this._value;
  }
}

export function computed(fn) {
  return new computedRefImpl(fn);
}
