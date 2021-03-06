'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        component: null,
        shapeFlag: getShapeFlag(type),
        el: null,
        key: props && props.key,
    };
    if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    else if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

const extend = Object.assign;
function isObject(value) {
    return value !== null && typeof value === "object";
}
const hasChanged = (val, newValue) => {
    return !Object.is(val, newValue);
};
const hasOwn = (target, key) => {
    return Object.prototype.hasOwnProperty.call(target, key);
};
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const camelize = (str) => {
    return str.replace(/-([a-zA-Z])/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

let activeEffect;
let shouldTrack = false;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.active = true;
        this.deps = new Set();
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // ???active???false???????????????stop??????????????????(??????????????????track???) ?????????????????????????????????
        if (!this.active) {
            return this._fn();
        }
        // ???active???true????????????????????????????????? ??????????????????shouldTrack
        shouldTrack = true;
        activeEffect = this;
        const res = this._fn();
        // ????????????????????????????????????????????????????????????ReactiveEffect?????????????????????????????????
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
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    // ??? effect.deps ??????
    effect.deps.clear();
}
const targetMap = new WeakMap();
function track(target, key) {
    if (!isTracking())
        return;
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
function trackEffects(dep) {
    if (!isTracking())
        return;
    dep.add(activeEffect);
    activeEffect.deps.add(dep);
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    dep.forEach((effect) => {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    });
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        const res = Reflect.get(target, key, receiver);
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            track(target, key);
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
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key: "${String(key)}" set???????????????target???readonly??????`, target);
        return true;
    },
};
const shallowHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

function reactive(raw) {
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowHandlers);
}
function createReactiveObject(raw, baseHandler) {
    return new Proxy(raw, baseHandler);
}

function emit(instance, event, ...args) {
    const { props } = instance;
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

function initSlots(instance, children) {
    // slots
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
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
function ref(value) {
    return new RefImpl(value);
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(ref) {
    return new Proxy(ref, {
        get(target, key, receiver) {
            return unRef(Reflect.get(target, key, receiver));
        },
        set(target, key, value, receiver) {
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value, receiver);
            }
        },
    });
}

function createComponentInstance(vnode, parent) {
    console.log("createComponentInstance", parent);
    const component = {
        vnode,
        nextVNode: null,
        type: vnode.type,
        setupState: {},
        proxy: null,
        props: {},
        emit: () => { },
        slots: {},
        provides: parent ? Object.create(parent.provides) : {},
        parent,
        isMounted: false,
        subtree: {},
        update: null, // effect?????????
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    // _ctx
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // function Object
    // TODO function
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    const instance = getCurrentInstance();
    if (instance) {
        const { provides } = instance;
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const instance = getCurrentInstance();
    const parentProvides = instance.parent.provides;
    if (key in parentProvides) {
        return parentProvides[key];
    }
    else {
        if (typeof defaultValue === "function") {
            return defaultValue();
        }
        else {
            return defaultValue;
        }
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

function shouldUpdateComponent(n1, n2) {
    const prevProps = n1.props, nextProps = n2.props;
    for (const key in prevProps) {
        if (prevProps[key] !== nextProps[key])
            return true;
    }
    for (const key in nextProps) {
        if (prevProps[key] !== nextProps[key])
            return true;
    }
    return false;
}

const callbacks = [];
let isPending = false;
function queueJobs(job) {
    if (!callbacks.includes(job)) {
        callbacks.push(job);
    }
    flushCallbacks();
}
function flushCallbacks() {
    if (!isPending) {
        isPending = true;
        nextTick(() => {
            isPending = false;
            const eventList = [...callbacks];
            callbacks.length = 0;
            eventList.forEach((fn) => {
                fn();
            });
        });
    }
}
function nextTick(fn) {
    if (typeof Promise !== "undefined") {
        return fn ? Promise.resolve().then(fn) : Promise.resolve();
    }
    else {
        return setTimeout(() => fn && fn());
    }
}
// https://blog.csdn.net/QingHan_wow/article/details/111291256

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentComponent, anchor) {
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processFragment(n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log("patchElement");
        console.log(n1, n2);
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
        patchChildren(el, n1, n2, container, parentComponent, anchor);
    }
    function patchProps(el, oldProps, newProps) {
        if (oldProps === newProps)
            return;
        for (const key in newProps) {
            const oldVal = oldProps[key];
            const newVal = newProps[key];
            if (oldVal !== newVal) {
                hostPatchProp(el, key, oldVal, newVal);
            }
        }
        for (const key in oldProps) {
            if (!(key in newProps)) {
                hostPatchProp(el, key, oldProps[key], null);
            }
        }
    }
    function patchChildren(el, n1, n2, container, parentComponent, anchor) {
        const { children: prevChildren, shapeFlag: prevShapeFlag } = n1;
        const { children: nextChildren, shapeFlag: nextShapeFlag } = n2;
        if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            if (nextShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                hostSetElementText(el, "");
                mountChildren(nextChildren, container, parentComponent, anchor);
            }
            else {
                if (prevChildren !== nextChildren) {
                    hostSetElementText(el, nextChildren);
                }
            }
        }
        else {
            if (nextShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                unmountChildren(prevChildren);
                hostSetElementText(el, nextChildren);
            }
            else {
                // TODO children - children
                patchKeyedChildren(prevChildren, nextChildren, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(prevChildren, nextChildren, container, parentComponent, parentAnchor) {
        let i = 0, e1 = prevChildren.length - 1, e2 = nextChildren.length - 1;
        const isSameVNodeType = (n1, n2) => {
            return n1.type === n2.type && n1.key === n2.key;
        };
        // ??????????????????
        while (i <= e1 && i <= e2) {
            const n1 = prevChildren[i], n2 = nextChildren[i];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // ??????????????????
        while (i <= e1 && i <= e2) {
            const n1 = prevChildren[e1], n2 = nextChildren[e2];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // ???????????????????????????
        if (i > e1) {
            let anchor;
            const pos = e2 + 1;
            // ????????????
            // A,B
            // A,B,C,D
            // i = 2, e1 = 1, e2 = 3
            if (pos >= nextChildren.length) {
                anchor = null;
            }
            // ????????????
            // E,A,B
            // E,C,D,A,B
            // i = 1, e1 = 0, e2 = 2
            else {
                anchor = nextChildren[pos].el;
            }
            while (i <= e2) {
                const n2 = nextChildren[i];
                patch(null, n2, container, parentComponent, anchor);
                i++;
            }
        }
        // ???????????????????????????
        // ?????? ???????????????
        // (a b) c d
        // (a b)
        // i = 2 e1 = 3 e2 = 1
        // ?????? ???????????????
        // a d (b c)
        // (b c)
        // i = 0, e1 = 1, e2 = -1
        else if (i > e2) {
            while (i <= e1) {
                const n1 = prevChildren[i].el;
                hostRemove(n1);
                i++;
            }
        }
        else {
            // ????????????  (?????????????????????????????????????????????)
            // a,b,(c,d,h),f,g
            // a,b,(e,c),f,g
            // i = 2 e1 = 4 e2 = 3
            let s1 = i, s2 = i, patchedNum = 0;
            const toBePatched = e2 - s2 + 1;
            const keyToIndexMap = new Map();
            const newIndexToOldIndexMap = new Array(toBePatched).fill(-1); //
            for (let i = s2; i <= e2; i++) {
                keyToIndexMap.set(nextChildren[i].key, i);
            }
            for (let i = s1; i <= e1; i++) {
                let lastIndex;
                if (patchedNum >= toBePatched) {
                    hostRemove(prevChildren[i].el);
                    continue;
                }
                if (keyToIndexMap.get(prevChildren[i].key) !== null) {
                    lastIndex = keyToIndexMap.get(prevChildren[i].key);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChildren[i], nextChildren[j])) {
                            lastIndex = j;
                            break;
                        }
                    }
                }
                if (lastIndex !== undefined) {
                    // ??????????????????????????????????????????????????????????????????key?????????
                    newIndexToOldIndexMap[lastIndex - s2] = i; // key ????????????????????????????????? ?????????0?????? value????????????????????????
                    patch(prevChildren[i], nextChildren[lastIndex], container, parentComponent, null);
                    patchedNum++;
                }
                else {
                    // ?????????
                    hostRemove(prevChildren[i].el);
                }
            }
            // ?????? (?????????????????????????????????????????????????????????)
            // (A B) C D E (F G)
            // (A B) E C D (F G)
            // i = 2 e1 = 4 e2 = 4
            // ???????????????????????? ??????????????????
            const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap);
            let j = increasingNewIndexSequence.length - 1; // ????????????????????????????????????????????????????????????????????????
            // ?????? ?????????????????? ??????????????????????????????????????????????????????
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2; // ?????????nextChildren??????????????????
                let anchor = nextIndex + 1 > nextChildren.length - 1
                    ? null
                    : nextChildren[nextIndex + 1].el;
                if (newIndexToOldIndexMap[i] === -1) {
                    // ????????????????????????????????? ?????????
                    patch(null, nextChildren[nextIndex], container, parentComponent, anchor);
                }
                else if (j >= 0 && increasingNewIndexSequence[j] === i) {
                    // ?????????????????????????????? ????????????j????????????
                    j--;
                }
                else {
                    // ????????????????????????????????? ???????????????
                    hostInsert(nextChildren[nextIndex].el, container, anchor);
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            hostRemove(el);
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        const el = (vnode.el = hostCreateElement(vnode.type));
        const { props } = vnode;
        if (props) {
            for (const key in vnode.props) {
                const val = props[key];
                // const isOn = (key: string) => /^on[A-Z]/.test(key);
                // if (isOn(key)) {
                //   const event = key.slice(2).toLowerCase();
                //   el.addEventListener(event, val);
                // } else {
                //   el.setAttribute(key, val);
                // }
                hostPatchProp(el, key, null, val);
            }
        }
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        // container.append(el);
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            debugger;
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        n2.el = n1.el;
        if (shouldUpdateComponent(n1, n2)) {
            instance.nextVNode = n2;
            instance.update();
        }
        else {
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                console.log("init");
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, instance, anchor);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log("update");
                const { nextVNode } = instance;
                if (nextVNode) {
                    updateComponentPreRender(instance, nextVNode);
                }
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                console.log("update-scheduler");
                queueJobs(instance.update);
            },
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.nextVNode = null;
    instance.props = nextVNode.props;
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (nextVal === undefined || nextVal === null) {
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.removeEventListener(event);
        }
        else {
            el.removeAttribute(key);
        }
    }
    else {
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, nextVal);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(child, container, anchor = null) {
    // container.append(el);
    container.insertBefore(child, anchor);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlots = renderSlots;
