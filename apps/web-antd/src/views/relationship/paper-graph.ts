import type { GraphData, GraphEdge, GraphNode } from '#/api/relationship';

import { getRelationColor, isBidirectionalRelation } from './constants';
import { layoutNetwork } from './paper-layout';

type Point = { x: number; y: number };
type Positioned = Point & {
  color: string;
  drift: number;
  node: GraphNode;
  origin: Point;
  phase: number;
  radius: number;
};
type Pointer = Point & { id: number; moved: boolean; nodeId?: string };
type LoopPath = { distances: number[]; inset: number; length: number };
type Link = {
  edge: GraphEdge;
  end: Positioned;
  lineKey: string;
  loopPath?: LoopPath;
  start: Positioned;
};
type LinkExit = { link: Link; reverse: boolean };
type MovingDot = { arrived: boolean; distance: number; exit: LinkExit };
type PaperTheme = { dark: boolean; labelBackground: string };

const colors = new Map([
  ['亲属', ['#ad5046', '#e99a8c']],
  ['其他', ['#537656', '#92b89b']],
  ['情感', ['#8b5944', '#dbad91']],
  ['社会', ['#2e5687', '#91b7f4']],
]);

export function paperCategoryColor(
  category: string | undefined,
  dark: boolean,
) {
  const pair = colors.get(category ?? '') ?? ['#5f6b79', '#b0bacb'];
  return pair[Number(dark)]!;
}

const tau = 2 * Math.PI;
const loopControlOffset = { x: 55, y: -60 };
const loopSamples = 64;
const dotSpeed = 20; // CSS 像素/秒
const maxDots = 10;
const nodesPerDot = 3;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function displayedRadius(radius: number, zoom: number) {
  return radius * clamp(zoom, 0.78, 2);
}

function hashId(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash;
}

function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

function along(start: Point, end: Point, progress: number): Point {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function alongLoop(center: Point, inset: number, progress: number): Point {
  const remaining = 1 - progress;
  const startWeight = remaining ** 3;
  const endWeight = progress ** 3;
  const controlWeight = 3 * remaining * progress;
  return {
    x:
      center.x +
      inset * (startWeight - endWeight) +
      loopControlOffset.x * controlWeight * (remaining - progress),
    y:
      center.y -
      inset * (startWeight + endWeight) +
      loopControlOffset.y * controlWeight,
  };
}

function measureLoop(inset: number): LoopPath {
  const center = { x: 0, y: 0 };
  const distances = [0];
  let previous = alongLoop(center, inset, 0);
  let length = 0;
  for (let index = 1; index <= loopSamples; index++) {
    const point = alongLoop(center, inset, index / loopSamples);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    distances.push(length);
    previous = point;
  }
  return { distances, inset, length };
}

function loopProgress({ distances, length }: LoopPath, distance: number) {
  if (distance >= length) return 1;
  const next = distances.findIndex((sample) => sample > distance);
  const start = distances[next - 1]!;
  const end = distances[next]!;
  return (next - 1 + (distance - start) / (end - start)) / loopSamples;
}

export class PaperGraph {
  private readonly buttons = new Map<string, HTMLButtonElement>();
  private camera = { x: 0, y: 0, zoom: 1 };
  private readonly canvasContext: CanvasRenderingContext2D;
  private data: GraphData = { nodes: [], edges: [] };
  private dots: MovingDot[] = [];
  private readonly events = new AbortController();
  private fit = 1;
  private frame = 0;
  private height = 0;
  private hovered?: string;
  private readonly linkExits = new Map<string, LinkExit[]>();
  private links: Link[] = [];
  private motion = true;
  private motionTime = 0;
  private readonly pinned = new Map<string, Point>();
  private pixelRatio = 1;
  private pointer?: Pointer;
  private points = new Map<string, Positioned>();
  private readonly reducedMotion = matchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  private readonly resizeObserver: ResizeObserver;
  private selected?: string;
  private theme: PaperTheme;
  private tick?: number;
  private width = 0;
  private world = { x: 0, y: 0 };

  constructor(
    private readonly stage: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly layer: HTMLElement,
    theme: PaperTheme,
    private readonly openPerson: (id: string) => void,
  ) {
    this.canvasContext = canvas.getContext('2d')!;
    this.theme = theme;
    const { signal } = this.events;
    stage.addEventListener('pointerdown', this.pointerDown, { signal });
    stage.addEventListener('pointermove', this.pointerMove, { signal });
    stage.addEventListener('pointerup', this.pointerUp, { signal });
    stage.addEventListener(
      'pointerleave',
      (event) => {
        if (!this.pointer?.moved) this.endDrag(event);
      },
      { signal },
    );
    stage.addEventListener('pointercancel', this.endDrag, { signal });
    stage.addEventListener('lostpointercapture', this.endDrag, { signal });
    stage.addEventListener('wheel', this.wheel, { passive: false, signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        this.tick = undefined;
        this.invalidate();
      },
      { signal },
    );
    this.reducedMotion.addEventListener('change', () => this.invalidate(), {
      signal,
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
    this.resize();
  }

  centerOnNode(id: string) {
    const point = this.points.get(id);
    if (!point) return;
    this.camera.x = this.width / 2 - point.x * this.camera.zoom;
    this.camera.y = this.height / 2 - point.y * this.camera.zoom;
    this.focus(id);
  }

  destroy() {
    this.events.abort();
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.frame);
    this.layer.replaceChildren();
    this.buttons.clear();
  }

  fitView() {
    let left = this.world.x / 2;
    let right = left;
    let top = this.world.y / 2;
    let bottom = top;
    for (const { origin } of this.points.values()) {
      left = Math.min(left, origin.x);
      right = Math.max(right, origin.x);
      top = Math.min(top, origin.y);
      bottom = Math.max(bottom, origin.y);
    }
    const zoom = Math.min(
      this.fit,
      Math.max(1, this.width - 112) / Math.max(1, right - left),
      Math.max(1, this.height - 92) / Math.max(1, bottom - top),
    );
    this.camera = {
      zoom,
      x: (this.width - (left + right) * zoom) / 2,
      y: (this.height - (top + bottom) * zoom) / 2,
    };
    this.invalidate();
  }

  focus(id?: string) {
    this.selected = id;
    this.updateHighlight();
  }

  resetLayout() {
    this.pinned.clear();
    this.selected = undefined;
    this.layout();
    this.fitView();
  }

  setData(data: GraphData) {
    this.data = data;
    this.layout();
  }

  setMotion(enabled: boolean) {
    this.motion = enabled;
    this.tick = undefined;
    this.invalidate();
  }

  setTheme(theme: PaperTheme) {
    this.theme = theme;
    for (const [id, point] of this.points) {
      point.color = paperCategoryColor(point.node.category, theme.dark);
      this.buttons.get(id)?.style.setProperty('--person-color', point.color);
    }
    this.invalidate();
  }

  zoom(factor: number, x = this.width / 2, y = this.height / 2) {
    const scale = clamp(
      this.camera.zoom * factor,
      this.fit * 0.35,
      this.fit * 5,
    );
    const ratio = scale / this.camera.zoom;
    this.camera = {
      zoom: scale,
      x: x - (x - this.camera.x) * ratio,
      y: y - (y - this.camera.y) * ratio,
    };
    this.invalidate();
  }

  private addExit(id: string, exit: LinkExit) {
    const exits = this.linkExits.get(id);
    if (exits) exits.push(exit);
    else this.linkExits.set(id, [exit]);
  }

  private draw = (time: number) => {
    this.frame = 0;
    const running =
      this.motion && !this.reducedMotion.matches && this.points.size > 0;
    const elapsed = time - (this.tick ?? time);
    if (
      running &&
      this.tick !== undefined &&
      elapsed < 28 &&
      !this.pointer?.moved
    ) {
      this.invalidate();
      return;
    }
    if (running) this.motionTime += Math.min(elapsed, 48);
    this.tick = running ? time : undefined;
    this.moveNodes();
    const ctx = this.canvasContext;
    const { zoom, x, y } = this.camera;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(zoom, zoom);
    for (const link of this.links) this.drawLink(link);
    if (running) {
      const occupied = new Set(this.dots.map(({ exit }) => exit.link.lineKey));
      for (const dot of this.dots) this.drawDot(dot, elapsed, occupied);
    }
    ctx.restore();
    if (running) this.invalidate();
  };

  private drawDot(dot: MovingDot, elapsed: number, occupied: Set<string>) {
    if (dot.arrived) {
      occupied.delete(dot.exit.link.lineKey);
      dot.exit = this.nextExit(dot.exit, occupied);
      occupied.add(dot.exit.link.lineKey);
      dot.distance = 0;
    }

    const { link, reverse } = dot.exit;
    const start = reverse ? link.end : link.start;
    const end = reverse ? link.start : link.end;
    const { zoom } = this.camera;
    const startRadius = displayedRadius(start.radius, zoom);
    const endRadius = displayedRadius(end.radius, zoom);
    const loopInset = startRadius / (Math.SQRT2 * zoom);
    if (start === end && link.loopPath?.inset !== loopInset) {
      link.loopPath = measureLoop(loopInset);
    }
    const { loopPath } = link;
    const span = loopPath
      ? loopPath.length * zoom
      : Math.max(
          0,
          Math.hypot(end.x - start.x, end.y - start.y) * zoom -
            startRadius -
            endRadius,
        );
    dot.distance = Math.min(span, dot.distance + (elapsed * dotSpeed) / 1000);
    dot.arrived = dot.distance === span;
    const point = loopPath
      ? alongLoop(start, loopInset, loopProgress(loopPath, dot.distance / zoom))
      : along(
          start,
          end,
          (startRadius + dot.distance) / (startRadius + span + endRadius),
        );
    const ctx = this.canvasContext;
    const active = this.hovered || this.selected;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.6 / zoom, 0, tau);
    ctx.globalAlpha =
      active && active !== link.edge.source && active !== link.edge.target
        ? 0.25
        : 0.8;
    ctx.fillStyle = end.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawLink({ edge, start, end }: Link) {
    const ctx = this.canvasContext;
    const { zoom } = this.camera;
    const active = this.hovered || this.selected;
    const focused = active === edge.source || active === edge.target;
    const loop = start === end;
    const color = getRelationColor(edge.relationType);
    ctx.lineWidth = (focused ? 1.8 : 1.1) / zoom;
    ctx.globalAlpha = focused ? 0.85 : active ? 0.15 : 0.48;
    ctx.strokeStyle = focused ? color : this.theme.dark ? '#abb4c0' : '#747575';
    ctx.beginPath();
    if (loop) {
      const loopInset =
        displayedRadius(start.radius, zoom) / (Math.SQRT2 * zoom);
      ctx.moveTo(start.x + loopInset, start.y - loopInset);
      ctx.bezierCurveTo(
        start.x + loopControlOffset.x,
        start.y + loopControlOffset.y,
        start.x - loopControlOffset.x,
        start.y + loopControlOffset.y,
        start.x - loopInset,
        start.y - loopInset,
      );
    } else {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (focused && !loop) {
      const startRadius = displayedRadius(start.radius, zoom);
      const endRadius = displayedRadius(end.radius, zoom);
      const length = Math.hypot(end.x - start.x, end.y - start.y) * zoom;
      const bidirectional = isBidirectionalRelation(
        edge.relationType,
        edge.direction || '双向',
      );
      const size = Math.min(5, length - startRadius - endRadius - 3);
      if (!bidirectional && size >= 2) {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const tip = along(start, end, 1 - endRadius / length);
        const wing = size / zoom;
        ctx.beginPath();
        ctx.moveTo(
          tip.x + wing * Math.cos(angle + 2.5),
          tip.y + wing * Math.sin(angle + 2.5),
        );
        ctx.lineTo(tip.x, tip.y);
        ctx.lineTo(
          tip.x + wing * Math.cos(angle - 2.5),
          tip.y + wing * Math.sin(angle - 2.5),
        );
        ctx.stroke();
      }
      const mid = along(start, end, 0.5);
      ctx.font = `500 ${11 / zoom}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3 / zoom;
      ctx.strokeStyle = this.theme.labelBackground;
      ctx.fillStyle = this.theme.dark ? '#d9dce2' : '#53565d';
      ctx.strokeText(edge.relationType, mid.x, mid.y - 5 / zoom);
      ctx.fillText(edge.relationType, mid.x, mid.y - 5 / zoom);
    }
  }

  private endDrag = (event: PointerEvent) => {
    if (this.pointer?.id !== event.pointerId) return;
    this.pointer = undefined;
    this.stage.classList.remove('is-dragging');
  };

  private invalidate() {
    if (!this.frame && this.width > 0 && !document.hidden)
      this.frame = requestAnimationFrame(this.draw);
  }

  private layout() {
    if (this.width === 0) return;
    const neighbors = new Map(
      this.data.nodes.map(({ id }) => [id, new Set<string>()]),
    );
    for (const { source, target } of this.data.edges) {
      neighbors.get(source)?.add(target);
      neighbors.get(target)?.add(source);
    }
    const degree = (node: GraphNode) => neighbors.get(node.id)?.size ?? 0;
    const sorted = [...this.data.nodes].sort(
      (a, b) => degree(b) - degree(a) || a.name.localeCompare(b.name, 'zh-CN'),
    );
    const hub =
      sorted[0] && (degree(sorted[0]) >= 2 || sorted.length === 1)
        ? sorted[0]
        : undefined;
    const seeds = layoutNetwork(hub, sorted, neighbors, {
      fit: this.fit,
      height: this.world.y,
      width: this.world.x,
    });
    this.points = new Map(
      seeds.map(({ node, x, y, localCenter, drift }) => {
        const manual = this.pinned.get(node.id);
        const origin = manual
          ? { x: manual.x * this.world.x, y: manual.y * this.world.y }
          : { x, y };
        const radius =
          node === hub && sorted.length > 1
            ? 10
            : localCenter
              ? 8
              : clamp(3.5 + Math.sqrt(degree(node)), 4, 7.5);
        return [
          node.id,
          {
            ...origin,
            origin,
            radius,
            drift,
            node,
            color: paperCategoryColor(node.category, this.theme.dark),
            phase: ((hashId(node.id) % 360) / 360) * tau,
          },
        ];
      }),
    );
    const previousLinks = new Map(this.links.map((link) => [link.edge, link]));
    this.links = [];
    this.linkExits.clear();
    for (const edge of this.data.edges) {
      const start = this.points.get(edge.source);
      const end = this.points.get(edge.target);
      if (!start || !end) continue;
      // 正反向或多条关系可能共用同一根可见连线。
      const lineKey = JSON.stringify([edge.source, edge.target].sort());
      const link = previousLinks.get(edge) ?? { edge, end, lineKey, start };
      link.start = start;
      link.end = end;
      this.links.push(link);
      this.addExit(edge.source, { link, reverse: false });
      if (
        start !== end &&
        isBidirectionalRelation(edge.relationType, edge.direction || '双向')
      ) {
        this.addExit(edge.target, { link, reverse: true });
      }
    }
    this.updateDots();
    if (this.hovered && !this.points.has(this.hovered))
      this.hovered = undefined;
    if (this.selected && !this.points.has(this.selected))
      this.selected = undefined;
    this.renderButtons();
    this.updateHighlight();
  }

  private moveNodes() {
    const time = this.motionTime / 1000;
    const ramp = Math.min(1, time / 1.25) / Math.max(0.65, this.fit);
    const { zoom, x, y } = this.camera;
    for (const [id, point] of this.points) {
      const { origin, phase, radius, drift } = point;
      const minimum = radius === 10 ? 1.4 : radius === 8 ? 2 : 2.8;
      const span = (minimum + (5.5 - minimum) * drift) * ramp;
      const cycle = time * (0.62 + (phase / tau) * 0.18);
      if (this.pointer?.nodeId !== id || !this.pointer.moved) {
        point.x = origin.x + span * Math.sin(cycle + phase);
        point.y = origin.y + span * 0.75 * Math.cos(cycle * 0.87 + phase * 1.4);
      }
      const button = this.buttons.get(id)!;
      button.style.translate = `${x + point.x * zoom}px ${y + point.y * zoom}px`;
      button.style.setProperty(
        '--person-radius',
        `${displayedRadius(radius, zoom)}px`,
      );
    }
  }

  private nextExit(
    { link, reverse }: LinkExit,
    occupied: Set<string>,
  ): LinkExit {
    const { source, target } = link.edge;
    const node = reverse ? source : target;
    const exits = this.linkExits.get(node) ?? [];
    const onward = exits.filter((exit) => exit.link.lineKey !== link.lineKey);
    const next = pickRandom(
      (onward.length > 0 ? onward : exits).filter(
        (exit) => !occupied.has(exit.link.lineKey),
      ),
    );
    if (next) return next;

    // 当前节点没有空闲出口时，从其他节点的空闲连线重新出发。
    const starts: LinkExit[][] = [];
    for (const [id, options] of this.linkExits) {
      if (id === node) continue;
      const free = options.filter((exit) => !occupied.has(exit.link.lineKey));
      if (free.length > 0) starts.push(free);
    }
    const start = pickRandom(starts);
    // 上一条线已经释放。没有其他起点时，可以从它的源节点出发。
    return (start && pickRandom(start)) ?? { link, reverse: false };
  }

  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || this.pointer) return;
    const node = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '.paper-person',
    );
    this.pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      nodeId: node?.dataset.personId,
    };
  };

  private pointerMove = (event: PointerEvent) => {
    const pointer = this.pointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      pointer.moved = true;
      this.stage.setPointerCapture(event.pointerId);
      this.stage.classList.add('is-dragging');
      if (pointer.nodeId) this.focus(pointer.nodeId);
    }
    const node = pointer.nodeId && this.points.get(pointer.nodeId);
    if (node) {
      node.x += dx / this.camera.zoom;
      node.y += dy / this.camera.zoom;
      node.origin = { x: node.x, y: node.y };
      this.pinned.set(node.node.id, {
        x: node.x / this.world.x,
        y: node.y / this.world.y,
      });
    } else {
      this.camera.x += dx;
      this.camera.y += dy;
    }
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    this.invalidate();
  };

  private pointerUp = (event: PointerEvent) => {
    if (this.pointer?.id !== event.pointerId) return;
    if (!this.pointer.moved && !this.pointer.nodeId) this.focus();
    this.endDrag(event);
  };

  private renderButtons() {
    for (const [id, button] of this.buttons) {
      if (this.points.has(id)) continue;
      button.remove();
      this.buttons.delete(id);
    }
    for (const [id, { color, node, radius }] of this.points) {
      let button = this.buttons.get(id);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'paper-person';
        button.dataset.personId = id;
        const dot = document.createElement('span');
        dot.className = 'paper-person-dot';
        dot.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'paper-person-label';
        button.append(dot, label);
        button.addEventListener('click', (event) => {
          this.focus(id);
          if (event instanceof PointerEvent && event.pointerType === 'touch')
            this.openPerson(id);
        });
        button.addEventListener('dblclick', () => this.openPerson(id));
        button.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          this.focus(id);
          this.openPerson(id);
        });
        button.addEventListener('pointerenter', () => this.setHovered(id));
        button.addEventListener('pointerleave', () => this.setHovered());
        button.addEventListener('focus', () => this.setHovered(id));
        button.addEventListener('blur', () => this.setHovered());
        this.buttons.set(id, button);
        this.layer.append(button);
      }
      button.title = node.name;
      button.lastElementChild!.textContent = node.name;
      button.style.setProperty('--person-color', color);
      button.classList.toggle('paper-hub', radius >= 8);
    }
  }

  private resize() {
    const { width, height } = this.stage.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    const worldWidth = Math.max(500, width);
    this.world = {
      x: worldWidth,
      y: Math.max(500, (height * worldWidth) / width),
    };
    this.fit = Math.min(width / this.world.x, height / this.world.y);
    this.pixelRatio = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.round(width * this.pixelRatio);
    this.canvas.height = Math.round(height * this.pixelRatio);
    this.layout();
    this.fitView();
  }

  private setHovered(id?: string) {
    this.hovered = id;
    this.updateHighlight();
  }

  private updateDots() {
    const links = new Set(this.links);
    const availableByLine = new Map<string, Link>();
    const connected = new Set<string>();
    for (const link of this.links) {
      availableByLine.set(link.lineKey, link);
      connected.add(link.edge.source);
      connected.add(link.edge.target);
    }
    const count = Math.min(
      Math.ceil(connected.size / nodesPerDot),
      maxDots,
      availableByLine.size,
    );
    this.dots = this.dots
      .filter(({ exit }) => links.has(exit.link))
      .slice(0, count);
    for (const { exit } of this.dots) availableByLine.delete(exit.link.lineKey);
    const available = [...availableByLine.values()];
    while (this.dots.length < count) {
      const index = Math.floor(Math.random() * available.length);
      const [link] = available.splice(index, 1);
      this.dots.push({
        arrived: false,
        distance: 0,
        exit: { link: link!, reverse: false },
      });
    }
  }

  private updateHighlight() {
    const active = this.hovered || this.selected;
    const visible = new Set([active]);
    for (const { edge } of this.links) {
      if (edge.source === active) visible.add(edge.target);
      if (edge.target === active) visible.add(edge.source);
    }
    for (const [id, button] of this.buttons) {
      button.classList.toggle('is-muted', Boolean(active) && !visible.has(id));
      button.setAttribute('aria-pressed', String(this.selected === id));
    }
    this.invalidate();
  }

  private wheel = (event: WheelEvent) => {
    event.preventDefault();
    const rect = this.stage.getBoundingClientRect();
    this.zoom(
      Math.exp(-clamp(event.deltaY, -100, 100) * 0.0025),
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  };
}
