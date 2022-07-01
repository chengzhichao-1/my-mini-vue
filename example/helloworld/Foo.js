import { h } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
  setup(props, { emit }) {
    // // props.count
    // console.log(props);
    // // shallow readonly
    // props.count++
    // console.log(props);

    const emitAdd = () => {
      console.log("emit add");
      emit("add",1,2);
      emit("add-foo");
    };

    return {
      emitAdd,
    };
  },
  render() {
    // return h("div", {}, "foo: " + this.count);

    const btn = h(
      "button",
      {
        onClick: this.emitAdd,
      },
      "emitAdd"
    );

    const foo = h("p", {}, "foo");
    return h("div", {}, [foo, btn]);
  },
};