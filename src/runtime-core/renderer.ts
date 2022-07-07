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
        if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n2, container, parentComponent, anchor);
        } else if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor);
        }
        break;
    }
  }

  function processText(n1, n2: any, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processFragment(n2: any, container: any, parentComponent, anchor) {
    mountChildren(n2.children, container, parentComponent, anchor);
  }

  function processElement(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor);
    } else {
      patchElement(n1, n2, parentComponent, anchor);
    }
  }

  function patchElement(n1, n2, parentComponent, anchor) {
    console.log("patchElement");

    console.log(n1, n2);

    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    const el = (n2.el = n1.el);

    patchProps(el, oldProps, newProps);
    patchChildren(el, n1, n2, el, parentComponent, anchor);
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

  function patchChildren(
    el,
    n1: any,
    n2: any,
    container,
    parentComponent,
    anchor
  ) {
    const { children: prevChildren, shapeFlag: prevShapeFlag } = n1;
    const { children: nextChildren, shapeFlag: nextShapeFlag } = n2;
    if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        hostSetElementText(el, "");
        mountChildren(nextChildren, container, parentComponent, anchor);
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
        patchKeyedChildren(
          prevChildren,
          nextChildren,
          container,
          parentComponent,
          anchor
        );
      }
    }
  }

  function patchKeyedChildren(
    prevChildren,
    nextChildren,
    container,
    parentComponent,
    parentAnchor
  ) {
    let i = 0,
      e1 = prevChildren.length - 1,
      e2 = nextChildren.length - 1;

    const isSameVNodeType = (n1, n2) => {
      return n1.type === n2.type && n1.key === n2.key;
    };
    // 从左往右对比
    while (i <= e1 && i <= e2) {
      const n1 = prevChildren[i],
        n2 = nextChildren[i];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      i++;
    }
    // 从右往左对比
    while (i <= e1 && i <= e2) {
      const n1 = prevChildren[e1],
        n2 = nextChildren[e2];

      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    // 新的比老的长，创建
    if (i > e1) {
      let anchor;
      const pos = e2 + 1;
      // 右侧创建
      // A,B
      // A,B,C,D
      // i = 2, e1 = 1, e2 = 3
      if (pos >= nextChildren.length) {
        anchor = null;
      }
      // 左侧创建
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
    // 老的比新的长，删除
    // 左侧 即右侧删除
    // (a b) c d
    // (a b)
    // i = 2 e1 = 3 e2 = 1

    // 右侧 即左侧删除
    // a b (b c)
    // (b c)
    // i = 0, e1 = 1, e2 = -1
    else if (i <= e1) {
      debugger
      while (i <= e1) {
        const n1 = prevChildren[i].el;
        hostRemove(n1);
        i++;
      }
    }
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      hostRemove(el);
    }
  }

  function mountElement(vnode: any, container: any, parentComponent, anchor) {
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
      mountChildren(vnode.children, el, parentComponent, anchor);
    }

    // container.append(el);

    hostInsert(el, container, anchor);
  }

  function mountChildren(children: any, container, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor);
    });
  }

  function processComponent(n2: any, container: any, parentComponent, anchor) {
    mountComponent(n2, container, parentComponent, anchor);
  }

  function mountComponent(
    initialVNode: any,
    container,
    parentComponent,
    anchor
  ) {
    const instance = createComponentInstance(initialVNode, parentComponent);

    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(
    instance: any,
    initialVNode: any,
    container,
    anchor
  ) {
    console.log("instance", instance);

    effect(() => {
      if (!instance.isMounted) {
        console.log("init");
        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy));

        patch(null, subTree, container, instance, anchor);

        initialVNode.el = subTree.el;

        instance.isMounted = true;
      } else {
        console.log("update");
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree;

        patch(prevSubTree, subTree, container, instance, anchor);

        initialVNode.el = subTree.el;
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
