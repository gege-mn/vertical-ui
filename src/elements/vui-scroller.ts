const OWNS_INPUT =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog, [popover]';

// Keys these already use (Space presses a button, arrows move in a listbox) are left to them.
const OWNS_KEYS = `${OWNS_INPUT}, button, a[href], summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], [role="slider"]`;

function ownsInput(target: EventTarget | null, selector = OWNS_INPUT): boolean {
  return target instanceof Element && target.closest(selector) !== null;
}

/** A panel between the target and the canvas that can still scroll vertically keeps its wheel. */
function innerScrollsY(target: EventTarget | null, canvas: Element, deltaY: number): boolean {
  for (
    let el = target instanceof Element ? target : null;
    el && el !== canvas;
    el = el.parentElement
  ) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
    const room = deltaY < 0 ? el.scrollTop : el.scrollHeight - el.clientHeight - el.scrollTop;
    if (room > 1) return true;
  }
  return false;
}

const scrollBehavior = (): ScrollBehavior =>
  matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

/**
 * The horizontal canvas a vertical page scrolls on. A mouse wheel only sends
 * vertical deltas, so they are turned into sideways scrolling; trackpads and
 * touch already scroll sideways natively and are left alone.
 *
 * Columns advance left to right in `vertical-lr`, so this scrolls in the
 * ordinary LTR direction. Never set `direction: rtl` on it.
 */
export class VuiScroller extends HTMLElement {
  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    // Not gated on `(pointer: fine)`: touchscreen laptops report coarse and still have wheels.
    this.addEventListener('wheel', this.#onWheel, { passive: false });
    this.addEventListener('keydown', this.#onKey);
  }

  disconnectedCallback(): void {
    this.removeEventListener('wheel', this.#onWheel);
    this.removeEventListener('keydown', this.#onKey);
  }

  get #max(): number {
    return this.scrollWidth - this.clientWidth;
  }

  #onWheel = (e: WheelEvent): void => {
    if (e.defaultPrevented || e.ctrlKey || ownsInput(e.target)) return;
    if (Math.abs(e.deltaX) >= Math.abs(e.deltaY) || this.#max <= 0) return;
    if (innerScrollsY(e.target, this, e.deltaY)) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.clientWidth : 1;
    const delta = e.deltaY * unit;
    const atEdge =
      (delta < 0 && this.scrollLeft <= 0) || (delta > 0 && this.scrollLeft >= this.#max - 1);
    if (atEdge) return;
    e.preventDefault();
    this.scrollBy({ left: delta, behavior: 'instant' });
  };

  #onKey = (e: KeyboardEvent): void => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (ownsInput(e.target, OWNS_KEYS)) return;
    const page = this.clientWidth * 0.9;
    const step: Record<string, number> = {
      ArrowDown: 80,
      ArrowUp: -80,
      PageDown: page,
      PageUp: -page,
      ' ': e.shiftKey ? -page : page,
    };
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      this.scrollTo({ left: e.key === 'Home' ? 0 : this.#max, behavior: scrollBehavior() });
      return;
    }
    const left = step[e.key];
    if (left === undefined) return;
    e.preventDefault();
    this.scrollBy({ left, behavior: scrollBehavior() });
  };
}
