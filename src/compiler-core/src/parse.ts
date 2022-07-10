import { NodeTypes } from "./ast"

const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  const context = createParserContext(content)
  return createRoot(parseChildren(context))
}

function createParserContext(content: string) {
  return {
    source: content
  }
}

function createRoot(children) {
  return {
    children
  }
}

function parseChildren(context) {
  const nodes: any = []

  let node
  let s = context.source
  s = s.trim()
  if (s.startsWith("{{")) {
    node = parseInterpolation(context)
  } else if (s[0] === "<") {
    if (/[a-zA-Z]/i.test(s[1])) {
      node = parseElement(context)
    }
  }

  nodes.push(node)
  return nodes
}

function parseElement(context: any) {
  const element = parseTag(context, TagType.Start)

  parseTag(context, TagType.End)

  return element
}

function parseTag(context: any, type: TagType) {
  // <div></div>
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)
  const tag = match[1]
  advanceBy(context, match[0].length)
  advanceBy(context, 1)

  if (type === TagType.End) return

  return {
    type: NodeTypes.ELEMENT,
    tag
  }

}

function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length);
}

function parseInterpolation(context) {
  const openDelimiter = "{{"
  const closeDelimiter = "}}"

  advanceBy(context, openDelimiter.length)
  
  const closeIndex = context.source.indexOf(closeDelimiter)
  const rawContentLength = closeIndex
  const rawContent = context.source.slice(0, rawContentLength)
  const content = rawContent.trim()
  
  advanceBy(context, rawContentLength + closeDelimiter.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content
    }
  }
}