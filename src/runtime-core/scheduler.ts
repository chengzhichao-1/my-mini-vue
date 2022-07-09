const callbacks: Function[] = []
let isPending = false
export function queueJobs(job: Function) {
  if (!callbacks.includes(job)) {
    callbacks.push(job)
  }
  flushCallbacks()
}

function flushCallbacks() {
  if (!isPending) {
    isPending = true
    nextTick(() => {
      isPending = false
      const eventList = [...callbacks]
      callbacks.length = 0
      eventList.forEach((fn) => {
        fn()
      })
    })  
  }
}

export function nextTick(fn) {
  if (typeof Promise !== "undefined") {
    return fn ? Promise.resolve().then(fn) : Promise.resolve()
  } else {
    return setTimeout(() => fn && fn())
  }
}

// https://blog.csdn.net/QingHan_wow/article/details/111291256