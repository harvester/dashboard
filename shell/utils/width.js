/**
 * Sets the width of a DOM element. Adapted from [youmightnotneedjquery.com](https://youmightnotneedjquery.com/#set_width)
 * @param {NodeListOf<Element> | Element} el - The target DOM element
 * @param {function | string | number} val - The desired width represented as a Number
 */
export function setWidth(el, val) {
  let nodeList = [];

  if ('length' in el) {
    nodeList = Array.from(el);
  }

  const _el = nodeList.length ? nodeList[0] : el;

  if (typeof val === 'function') {
    val = val();
  }

  if (typeof val === 'string') {
    _el.style.width = val;

    return;
  }

  _el.style.width = `${ val }px`;
}

/**
 * Gets the width of a DOM element. Adapted from [youmightnotneedjquery.com](https://youmightnotneedjquery.com/#get_width)
 * @param {NodeListOf<Element> | Element} el - The target DOM element
 * @returns Number representing the width for the provided element
 */
export function getWidth(el) {
  if ('length' in el) {
    const nodeList = Array.from(el);

    return nodeList.length ? parseFloat(getComputedStyle(el[0]).width.replace('px', '')) : 0;
  }

  return parseFloat(getComputedStyle(el).width.replace('px', ''));
}
