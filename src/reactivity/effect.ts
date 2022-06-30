import { extend } from "../shared";

let activeEffect;
let shouldTrack = false;

export class ReactiveEffect {
  private _fn: any;
  public scheduler?: Function;
  active: boolean = true;
  deps = new Set();
  onStop?: Function;
  constructor(fn: Function, scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }
  run() {
    // 当active为false时代表已经stop，不收集依赖(具体的逻辑在track中) 但是当前函数依旧要执行
    if (!this.active) {
      return this._fn();
    }

    // 当active为true时代表可以继续收集依赖 需要打开开关shouldTrack
    shouldTrack = true;
    activeEffect = this;
    const res = this._fn();
    // 执行完函数后将开关关上，因为可能会有其他ReactiveEffect对象用到这个公共的开关
    shouldTrack = false;

    return res;
  }
  stop() {
    if (this.active) {
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
  // 把 effect.deps 清空
  effect.deps.clear();
}

const targetMap = new WeakMap();

export function track(target, key) {
  if (!isTracking()) return;

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

  trackEffects(dep);
}

export function trackEffects(dep) {
  if (!isTracking()) return;
  dep.add(activeEffect);
  activeEffect.deps.add(dep);
}

function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}

export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);
  triggerEffects(dep);
}

export function triggerEffects(dep) {
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
  runner.effect = _effect;
  return runner;
}

export function stop(runner: any) {
  runner.effect.stop();
}
