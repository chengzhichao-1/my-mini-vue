export function shouldUpdateComponent(n1: any, n2: any) {
  const prevProps = n1.props, nextProps = n2.props
  for (const key in prevProps) {
    if (prevProps[key] !== nextProps[key]) return true
  }
  for (const key in nextProps) {
    if (prevProps[key] !== nextProps[key]) return true
  }
  return false
}