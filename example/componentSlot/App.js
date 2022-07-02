import { h, createTextVNode } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  name: "App",
  render() {
    const app = h("div", {}, "App");
    
    // 单值 vnode
    // const foo = h(Foo, {}, h("p", {}, "123"));
    
    // 数组 vnode
    // const foo = h(Foo, {}, [h("p", {}, "123"), h("p", {}, "456")]);
    
    // 普通具名插槽
    // object key
    // const foo = h(
    //   Foo,
    //   {},
    //   {
    //     header: h("p", {}, "header"),
    //     footer: h("p", {}, "footer"),
    //   }
    // );
    
    // 具名插槽+作用域插槽
    // object key
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => [h("p", {}, "header" + age), createTextVNode("textVNode")],
        footer: () => h("p", {}, "footer"),
      }
    );
    return h("div", {}, [app, foo]);
  },

  setup() {
    return {};
  },
};