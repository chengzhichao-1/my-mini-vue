import { isObject } from "../shared/index";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  patch(vnode, container);
}

function patch(vnode, container) {
  if (isObject(vnode.type)) {
    processComponent(vnode, container);
  } else if (typeof vnode.type === "string") {
    processElement(vnode, container);
  }
}

function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  const el = document.createElement(vnode.type);

  if (vnode.props) {
    for (const key in vnode.props) {
      el.setAttribute(key, vnode.props[key]);
    }
  }

  if (typeof vnode.children === "string") {
    el.textContent = vnode.children;
  } else if (Array.isArray(vnode.children)) {
    mountChildren(vnode, el);
  }

  container.append(el)
}

function mountChildren(vnode, container) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}

function mountComponent(vnode: any, container) {
  const instance = createComponentInstance(vnode);

  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function setupRenderEffect(instance: any, container) {
  const subTree = instance.render();

  patch(subTree, container);
}
