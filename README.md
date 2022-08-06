# mini-vue

## 学习思路

1. 逻辑拆分
2. TDD
   1. 写测试用例
   2. 跑通测试用例
   3. 重构优化
3. 自顶向下开发模式



## 整体架构

![](.\README.assets\image-20220805191326744.png)

编译

compiler-sfc解析.vue文件





运行时





## Reactive模块

### ReactiveEffect类

1. active: boolean

   初始值为true，用于判断是否执行过stop函数，当值为false，不再执行stop函数，防止重复调用cleanupEffect函数

2. _fn: Function

   effect中传入的fn

3. scheduler: Function

   effect的可选参数，如果scheduler有值，除了第一次effect函数会调用\_effect对象的run方法，即执行effect中传入的fn，之后都会执行scheduler函数

4. deps: Array

   用于存放该\_effect对象中的依赖dep，dep中包含各种依赖fn

   值得注意的是，\_effect对象与fn是多对多的关系

5. opStop: Function

   effect函数的可选参数中传入的选项，当调用stop函数后会执行该函数

6. run: 类方法

   如果active为false则直接返回fn的执行结果

   将activeFn赋值为this，即该ReactiveEffect类创建出来的对象_effect

   调用用户在effect中传入的fn函数，并返回fn执行的结果

   在run开始结束前会通过开关shouldTrack来控制是否追踪收集依赖

7. stop: 类方法

   调用该方法后会清除\_effect对象中的所有dep中存入的this，即自己_effect对象，并清空deps数组

   active状态变为false



### activeEffect公共变量

作用：保存当前处理的\_effect对象，便于track中进行依赖的收集

来源：effect函数中通过ReactiveEffect类创建\_effect对象，当调用\_effect对象的run方法时，如果active为true，则将activeEffect = this，即将_effect赋值给activeEffect

### shouldTrack公共变量

作用：默认值为false，用于判断是否追踪依赖，在ReactiveEffect的run方法中控制开闭

来源：调用stop后，当我们清除依赖后，可能会意外的重新收集依赖，例如调用代理对象某属性++，会先触发get再set，get中调用track，便会重新收集依赖，导致stop失效，因此需要在track函数调用后通过shouldTrack判断是否需要追踪收集依赖

### reactive函数

参数：传入一个对象

返回值：返回代理的响应式对象

作用：

1. 创建一个proxy代理对象
2. get中劫持key，若key为常量IS_REACTIVE，则返回true，为isReactive函数提供支持
3. get中对Reflect.get的返回值res进行判断，若res为对象则返回reactvie(res)，即实现嵌套逻辑，将对象中的所有属性都代理为响应式对象
4. get中调用track追踪收集响应式依赖
5. set中调用trigger触发依赖
6. 返回处理好的代理对象

### readonly函数

参数：传入一个对象

返回值：返回一个只读对象

作用：

1. 创建一个proxy代理对象
2. get中劫持key，若key为常量IS_READONLY，则返回true，为isReadonly函数提供支持
3. get中对Reflect的返回值res进行判断，若res为对象则返回readonly(res)，同上，实现嵌套逻辑，将对象中的所有属性都代理为只读对象
4. set中进行劫持，抛出警告，提示用户set失败，该对象为只读对象
5. 返回处理好的代理对象

### effect函数

参数：

1. fn
2. 可选对象，可以传入scheduler、onStop等函数

返回值：通过ReactiveEffect类创建的\_effect对象中的run方法

作用：

1. 通过ReactiveEffect类创建的\_effect对象
2. 在\_effect对象中添加对象的可选参数中的函数
3. 调用\_effect对象中的run方法
4. 返回runner，即\_effect对象中绑定了\_effect对象为this的run方法，注意不是run方法的返回值而是run方法
5. 给runner中绑定effect，便于后续stop方法的调用，即便于stop中调用effect中的stop

### targetMap公共变量

作用：存储键为响应式对象，值为depsMap的键值对

### track函数

参数：传入一个target对象和一个key对象的值

返回值：无

作用：

1. 首先判断是否需要执行收集依赖，当activeEffect为空或shouldTrack为false则不需要收集依赖
2. 从targetMap中获取depsMap，若depsMap为空说明要先初始化
3. 从depsMap中获得dep，若dep为空说明要先初始化
4. dep中添加activeEffect
5. 在activeEffect的deps中添加dep

### trigger函数

参数：传入一个target对象和一个key对象的值

返回值：无

作用：

1. 从targetMap中获取depsMap
2. 从depsMap中获取dep
3. 遍历dep中的effect并触发对应的依赖（如果有scheduler则执行它，没有则执行run）

### stop函数

参数：effect函数的返回值，即\_effect对象中绑定了\_effect对象为this的run方法

返回值：无

作用：执行runner.effect.stop()

### isReactive函数

参数：对象

返回值：布尔值

作用：访问这个对象的属性IS_REACTIVE，并将返回值返回，从而知道该对象是否为响应式对象，具体实现看reactive函数中的作用2

### isReadonly函数

参数：对象

返回值：布尔值

作用：访问这个对象的属性IS_READONLY，并将返回值返回，从而知道该对象是否为响应式对象，具体实现看readonly函数中的作用2