import { createComponentInstance, setupComponent } from "./component";
import { ShapeFlags } from "../shared/ShapeFlags";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;

  function render(vnode, container) {
    patch(null, vnode, container, null);
  }

  function patch(n1, n2, container, parentComponent) {
    const { type, shapeFlag } = n2;
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent);
        }
        break;
    }
  }

  function processText(n1, n2: any, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processFragment(n1, n2: any, container: any, parentComponent) {
    mountChildren(n2.children, container, parentComponent);
  }

  function processElement(n1, n2: any, container: any, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container, parentComponent);
    }
  }

  function patchElement(n1, n2, container, parentComponent) {
    console.log("patchElement");

    console.log(n1, n2);

    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    const el = (n2.el = n1.el);

    patchProps(el, oldProps, newProps);
    patchChildren(el, n1, n2, container, parentComponent);
  }

  function patchProps(el, oldProps, newProps) {
    if (oldProps === newProps) return;

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

  function patchChildren(el, n1: any, n2: any, container, parentComponent) {
    const { children: prevChildren, shapeFlag: prevShapeFlag } = n1;
    const { children: nextChildren, shapeFlag: nextShapeFlag } = n2;
    if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        hostSetElementText(el, "");
        mountChildren(nextChildren, container, parentComponent);
      } else {
        if (prevChildren !== nextChildren) {
          hostSetElementText(el, nextChildren);
        }
      }
    } else {
      if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        unmountChildren(prevChildren);
        hostSetElementText(el, nextChildren);
      } else {
        // TODO children - children
      }
    }
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      hostRemove(el);
    }
  }

  function mountElement(vnode: any, container: any, parentComponent) {
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
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent);
    }

    // container.append(el);

    hostInsert(el, container);
  }

  function mountChildren(children: any, container, parentComponent) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  function processComponent(n1, n2: any, container: any, parentComponent) {
    mountComponent(n2, container, parentComponent);
  }

  function mountComponent(initialVNode: any, container, parentComponent) {
    const instance = createComponentInstance(initialVNode, parentComponent);

    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
  }

  function setupRenderEffect(instance: any, initialVNode: any, container) {
    console.log("instance", instance);

    effect(() => {
      if (!instance.isMounted) {
        console.log("init");
        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy));

        patch(null, subTree, container, instance);

        initialVNode.el = subTree.el;

        instance.isMounted = true;
      } else {
        console.log("update");
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree;

        patch(prevSubTree, subTree, container, instance);

        initialVNode.el = subTree.el;
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
