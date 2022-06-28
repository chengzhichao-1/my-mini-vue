import { extend } from "../shared";

class ReactiveEffect {
  private _fn: any;
  active: boolean = true;
  deps = new Set()
  onStop?: Function 
  public scheduler: Function | undefined;
  constructor(fn: Function, scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }
  run() {
    activeEffect = this;
    return this._fn();
  }
  stop() {
    if (this.active) {
      this.deps.forEach((dep: any) => {
        dep.delete(this)
      })
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

let activeEffect;

const targetMap = new WeakMap();

export function track(target, key) {
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  if (!activeEffect) return;

  dep.add(activeEffect);
  activeEffect.deps.add(dep);
}

export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);
  dep.forEach((effect) => {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  });
}

type effectOptions = {
  scheduler?: Function;
  onStop?: Function;
};

export function effect(fn: Function, options: effectOptions = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  extend(_effect, options);
  _effect.run();
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect
  return runner;
}

export function stop(runner: any) {
  runner.effect.stop();
}