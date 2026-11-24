import { measureSpine } from './spine.js';

const MONGOLIAN = /\p{Script=Mongolian}/u;

export interface SpineOverlayOptions {
  root?: Element;
  color?: string;
}

/** The first family in a computed `font-family` list, unquoted. */
function primaryFamily(fontFamily: string): string {
  return (fontFamily.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
}

/**
 * Development aid: draws a line on the measured spine of every vertical
 * Mongolian text run under `root`, so alignment can be judged by eye on a real
 * page. Returns a function that removes it.
 *
 * A Range rect of a text run spans the font's content area, whose middle is
 * the line's middle; the spine is the measured offset to the right of that.
 */
export function showSpines({
  root = document.body,
  color = '#e5383b',
}: SpineOverlayOptions = {}): () => void {
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  document.body.append(layer);

  const offsets = new Map<string, number | null>();
  let frame = 0;

  const textNodes = (): Text[] => {
    const out: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const parent = n.parentElement;
      if (!parent || !MONGOLIAN.test(n.nodeValue ?? '')) continue;
      if (!getComputedStyle(parent).writingMode.startsWith('vertical')) continue;
      out.push(n as Text);
    }
    return out;
  };

  const draw = async () => {
    const lines: HTMLElement[] = [];
    for (const node of textNodes()) {
      const style = getComputedStyle(node.parentElement as Element);
      const family = primaryFamily(style.fontFamily);
      if (!offsets.has(family)) offsets.set(family, await measureSpine(`"${family}"`));
      const offset = offsets.get(family);
      if (offset === null || offset === undefined) continue;
      const size = Number.parseFloat(style.fontSize);
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (r.width === 0 || r.height === 0) continue;
        const line = document.createElement('div');
        const x = r.left + r.width / 2 + offset * size;
        line.style.cssText = `position:absolute;left:${x}px;top:${r.top}px;height:${r.height}px;border-left:1px solid ${color};`;
        lines.push(line);
      }
    }
    layer.replaceChildren(...lines);
  };

  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => void draw());
  };

  document.fonts.ready.then(schedule);
  addEventListener('scroll', schedule, { capture: true, passive: true });
  addEventListener('resize', schedule);
  // The layer itself lives under body: redrawing it must not count as a change.
  const observer = new MutationObserver((records) => {
    if (records.some((r) => !layer.contains(r.target))) schedule();
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true });

  return () => {
    cancelAnimationFrame(frame);
    removeEventListener('scroll', schedule, { capture: true });
    removeEventListener('resize', schedule);
    observer.disconnect();
    layer.remove();
  };
}
