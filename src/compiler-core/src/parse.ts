import { NodeTypes } from "./ast"

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
  context.source = context.source.trim()
  if (context.source.startsWith("{{")) {
    node = parseInterpolation(context)
  }

  nodes.push(node)
  return nodes
}

function parseInterpolation(context) {
  const openDelimiter = "{{"
  const closeDelimiter = "}}"

  context.source = context.source.slice(openDelimiter.length)

  const closeIndex = context.source.indexOf(closeDelimiter)
  const rawContentLength = closeIndex
  const rawContent = context.source.slice(0, rawContentLength)
  const content = rawContent.trim()
  
  context.source = context.source.slice(rawContentLength + closeDelimiter.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content
    }
  }
}