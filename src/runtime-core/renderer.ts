import { createComponentInstance, setupComponent } from "./component";
import { ShapeFlags } from "../shared/ShapeFlags";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";
import { shouldUpdateComponent } from "./componentUpdateUtils";

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
          processComponent(n1, n2, container, parentComponent, anchor);
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
    // a d (b c)
    // (b c)
    // i = 0, e1 = 1, e2 = -1
    else if (i > e2) {
      while (i <= e1) {
        const n1 = prevChildren[i].el;
        hostRemove(n1);
        i++;
      }
    } else {
      // 删除老的  (在老的里面存在，新的里面不存在)
      // a,b,(c,d,h),f,g
      // a,b,(e,c),f,g
      // i = 2 e1 = 4 e2 = 3
      let s1 = i,
        s2 = i,
        patchedNum = 0;
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
        } else {
          for (let j = s2; j <= e2; j++) {
            if (isSameVNodeType(prevChildren[i], nextChildren[j])) {
              lastIndex = j;
              break;
            }
          }
        }

        if (lastIndex !== undefined) {
          // 在新的节点中找到和老的节点相同节点类型和相同key的元素
          newIndexToOldIndexMap[lastIndex - s2] = i; // key 新节点中间元素从左到右 下标从0开始 value对应老节点的下标
          patch(
            prevChildren[i],
            nextChildren[lastIndex],
            container,
            parentComponent,
            null
          );
          patchedNum++;
        } else {
          // 没找到
          hostRemove(prevChildren[i].el);
        }
      }

      // 移动 (节点存在于新的和老的里面，但是位置变了)
      // (A B) C D E (F G)
      // (A B) E C D (F G)
      // i = 2 e1 = 4 e2 = 4
      // 求最长递增子序列 返回值为下标
      const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap);
      let j = increasingNewIndexSequence.length - 1; // 初始化为指向最长递增子序列中的最后一个元素的指针
      // 策略 从后往前遍历 新的中间节点与最长递增子序列的返回值
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2; // 记录在nextChildren中的真实下标
        let anchor =
          nextIndex + 1 > nextChildren.length - 1
            ? null
            : nextChildren[nextIndex + 1].el;

        if (newIndexToOldIndexMap[i] === -1) {
          // 新的元素不在老的序列中 则创建
          patch(
            null,
            nextChildren[nextIndex],
            container,
            parentComponent,
            anchor
          );
        } else if (j >= 0 && increasingNewIndexSequence[j] === i) {
          // 若在最长递增子序列中 则将指针j往前移动
          j--;
        } else {
          // 若不在最长递增子序列中 则移动位置
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

  function processComponent(
    n1: any,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    if (!n1) {
      mountComponent(n2, container, parentComponent, anchor);
    } else {
      debugger;
      updateComponent(n1, n2);
    }
  }

  function updateComponent(n1: any, n2: any) {
    const instance = (n2.component = n1.component);
    n2.el = n1.el;
    if (shouldUpdateComponent(n1, n2)) {
      instance.nextVNode = n2;
      instance.update();
    } else {
      instance.vnode = n2;
    }
  }

  function mountComponent(
    initialVNode: any,
    container,
    parentComponent,
    anchor
  ) {
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ));

    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(
    instance: any,
    initialVNode: any,
    container,
    anchor
  ) {
    instance.update = effect(() => {
      if (!instance.isMounted) {
        console.log("init");
        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy));

        patch(null, subTree, container, instance, anchor);

        initialVNode.el = subTree.el;

        instance.isMounted = true;
      } else {
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
        } else {
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
