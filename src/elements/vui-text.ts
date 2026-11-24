import { defaultPolicy, type Orientation, type OrientationPolicy, orientRuns } from '../runs.js';

const CLASS: Record<Exclude<Orientation, 'native'>, string> = {
  combine: 'vui-combine',
  upright: 'vui-upright',
  horizontal: 'vui-horizontal',
};

/** Builds nodes for `text`, wrapping only the runs whose orientation must change. */
export function orientedNodes(text: string, policy: OrientationPolicy = defaultPolicy): Node[] {
  return orientRuns(text, policy).map(({ text: t, orientation }) => {
    if (orientation === 'native') return document.createTextNode(t);
    const span = document.createElement('span');
    span.className = CLASS[orientation];
    span.textContent = t;
    return span;
  });
}

/**
 * Vertical text with per-run orientation. Light DOM, so page fonts and
 * `::highlight()` styles reach it.
 *
 * It owns its children: give it text through the `text` attribute or
 * property. Initial text content is read once if no attribute is set; a
 * framework that keeps rendering children into it will fight it.
 */
export class VuiText extends HTMLElement {
  static observedAttributes = ['text', 'combine-digits', 'upright-latin', 'upright-cyrillic'];
  #text: string | null = null;

  get text(): string {
    return this.#text ?? '';
  }
  set text(value: string) {
    this.setAttribute('text', value);
  }

  connectedCallback(): void {
    if (this.#text === null) this.#text = this.getAttribute('text') ?? this.textContent ?? '';
    this.#render();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'text') this.#text = value ?? '';
    if (this.isConnected) this.#render();
  }

  #policy(): OrientationPolicy {
    const n = (attr: string, fallback: number) => {
      const v = Number.parseInt(this.getAttribute(attr) ?? '', 10);
      return Number.isNaN(v) ? fallback : v;
    };
    return {
      ...defaultPolicy,
      combineDigits: n('combine-digits', defaultPolicy.combineDigits),
      uprightLatin: n('upright-latin', defaultPolicy.uprightLatin),
      uprightCyrillic: n('upright-cyrillic', defaultPolicy.uprightCyrillic),
    };
  }

  #render(): void {
    this.replaceChildren(...orientedNodes(this.text, this.#policy()));
  }
}
