import { NodeTypes } from "./ast";

const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context, []));
}

function createParserContext(content: string) {
  return {
    source: content,
  };
}

function createRoot(children) {
  return {
    children,
  };
}

function parseChildren(context, ancestors: any[]) {
  const nodes: any = [];

  while (!isEnd(context, ancestors)) {
    let node;
    let s = context.source;
    if (s.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      if (/[a-zA-Z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context);
    }

    nodes.push(node);
  }

  return nodes;
}

function parseText(context: any) {
  let endIndex = context.source.length;
  let endTokens = ["<", "{{"];

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context: any, length) {
  const content = context.source.slice(0, length);

  // 2. 推进
  advanceBy(context, length);
  return content;
}

function parseElement(context: any, ancestors) {
  const element: any = parseTag(context, TagType.Start);
  ancestors.push(element);
  element.children = parseChildren(context, ancestors);
  // ancestors.pop();
  if (isStartsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End);
  }

  return element;
}

function parseTag(context: any, type: TagType) {
  // <div></div>
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length);
  advanceBy(context, 1);

  if (type === TagType.End) return;

  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
}

function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length);
}

// 分析 插值
function parseInterpolation(context) {
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  advanceBy(context, openDelimiter.length);

  const closeIndex = context.source.indexOf(closeDelimiter);
  const rawContentLength = closeIndex;
  const rawContent = parseTextData(context, rawContentLength);
  const content = rawContent.trim();

  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}

function isEnd(content, ancestors: any[]) {
  const s = content.source;

  if (s.startsWith("</")) {
    const prevTag = ancestors[ancestors.length - 1].tag;
    if (isStartsWithEndTagOpen(s, prevTag)) {
      ancestors.pop()
      return true
    } else {
      throw new Error(`缺少结束标签:${prevTag}`);
    }
  }

  return !s;
}

function isStartsWithEndTagOpen(source, tag) {
  return (
    source.startsWith("</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}
