import { createRenderer } from "../runtime-core/index";

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el, key, prevVal, nextVal) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (nextVal === undefined || nextVal === null) {
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase();
      el.removeEventListener(event);
    } else {
      el.removeAttribute(key);
    }
  } else {
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, nextVal);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}

function insert(el, container) {
  container.append(el);
}

const renderer: any = createRenderer({ createElement, patchProp, insert });

export function createApp(...args) {
  return renderer.createApp(...args);
}

export * from "../runtime-core/index";
