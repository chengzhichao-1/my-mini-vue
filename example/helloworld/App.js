import {
  h
} from "../../lib/guide-mini-vue.esm.js";
import {
  Foo
} from "./Foo.js";

// window.self = null;
export const App = {
  // 必须要写 render
  render() {
    // window.self = this;
    // // ui
    // return h(
    //   "div", {
    //     id: "root",
    //     class: ["red", "hard"],
    //     onClick() {
    //       console.log("click");
    //     },
    //     onMousedown() {
    //       console.log("mousedown");
    //     }
    //   },
    //   // "hi, " + this.msg
    //   // string
    //   // "hi, mini-vue"
    //   // Array
    //   // [h("p", { class:"red"}, "hi"), h("p", {class:"blue"}, "mini-vue")]
    //   [
    //     h("div", {}, "hi," + this.msg),
    //     h(Foo, {
    //       count: 1,
    //     }),
    //   ]
    // );

    // emit
    return h("div", {}, [
      h("div", {}, "App"),
      h(Foo, {
        onAdd(a, b) {
          console.log("onAdd", a, b);
        },
        onAddFoo() {
          console.log("onAddFoo");
        },
      }),
    ]);
  },

  setup() {
    return {};
  },
};