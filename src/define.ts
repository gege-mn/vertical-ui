import { VuiScroller, VuiText } from './elements.js';

const elements: [string, CustomElementConstructor][] = [
  ['vui-text', VuiText],
  ['vui-scroller', VuiScroller],
];

for (const [name, element] of elements) {
  if (!customElements.get(name)) customElements.define(name, element);
}
