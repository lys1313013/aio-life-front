import type { GraphNode } from '#/api/relationship';

type Circle = { center: GraphNode; members: GraphNode[] };
type Seed = {
  anchorX: number;
  anchorY: number;
  labelWidth: number;
  localCenter: boolean;
  node: GraphNode;
  x: number;
  y: number;
};
type Pair = readonly [number, number];
type Connections = ReadonlyMap<string, ReadonlySet<string>>;

const paperAnchors: Pair[] = [
  [-0.52, 0.44],
  [0.57, -0.52],
  [-0.56, -0.43],
  [0.54, 0.37],
  [0.03, 0.59],
];
const tau = 2 * Math.PI;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function findCircles(
  nodes: GraphNode[],
  hub: GraphNode | undefined,
  links: Connections,
) {
  const remaining = new Map(
    nodes.filter((node) => node !== hub).map((node) => [node.id, node]),
  );
  const circles: Circle[] = [];
  const circleById = new Map<string, Circle>();

  // 用直接关系选出小中心，同分类的邻居权重略高。
  while (remaining.size > 1) {
    let nextCircle: Circle | undefined;
    let bestScore = 0;
    for (const center of remaining.values()) {
      const members: GraphNode[] = [];
      let score = 0;
      const centerLinks = links.get(center.id);
      for (const id of centerLinks ?? []) {
        const member = remaining.get(id);
        if (!member || member === center) continue;
        // 两个小中心相连时，给各自拥有独立成员的一方保留成圈的机会。
        const separateMembers = [...(links.get(id) ?? [])].filter(
          (neighbor) =>
            neighbor !== center.id &&
            !centerLinks?.has(neighbor) &&
            remaining.has(neighbor) &&
            (links.get(neighbor)?.size ?? 0) <= 2,
        );
        if (separateMembers.length >= 2) continue;
        members.push(member);
        score += member.category === center.category ? 3 : 2;
      }
      if (score <= bestScore) continue;
      bestScore = score;
      nextCircle = { center, members };
    }
    if (!nextCircle) break;
    circles.push(nextCircle);
    for (const { id } of [nextCircle.center, ...nextCircle.members]) {
      remaining.delete(id);
      circleById.set(id, nextCircle);
    }
  }

  const satellites: GraphNode[] = [];
  for (const node of remaining.values()) {
    const affinity = new Map<Circle, number>();
    for (const id of links.get(node.id) ?? []) {
      const circle = circleById.get(id);
      if (circle) affinity.set(circle, (affinity.get(circle) ?? 0) + 1);
    }
    const nearest = [...affinity].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (nearest) nearest.members.push(node);
    else satellites.push(node);
  }
  return { circles, satellites };
}

export function layoutNetwork(
  hub: GraphNode | undefined,
  nodes: GraphNode[],
  links: Connections,
  { width, height, fit }: { fit: number; height: number; width: number },
) {
  const centerX = width * 0.47;
  const centerY = height * 0.53;
  const { circles, satellites } = findCircles(nodes, hub, links);
  const seeds: Seed[] = [];
  const zoom = Math.max(0.5, fit);
  const makeSeed = (
    node: GraphNode,
    x: number,
    y: number,
    localCenter = false,
  ) => {
    seeds.push({
      node,
      x,
      y,
      anchorX: x,
      anchorY: y,
      localCenter,
      labelWidth: Math.min(Array.from(node.name).length, 8) * 14,
    });
  };
  const placeSatellites = (
    members: GraphNode[],
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
  ) => {
    const perBand = 8;
    for (const [index, node] of members.entries()) {
      const band = Math.floor(index / perBand);
      const count = Math.min(perBand, members.length - band * perBand);
      const radius = (1 + band * 0.54) * (index % 2 === 0 ? 0.94 : 1.06);
      const slot = index % perBand;
      const spread = count === 2 ? (slot - 0.5) * 2.1 : (slot / count) * tau;
      const angle = rotation + spread + band * 0.43;
      makeSeed(
        node,
        x + Math.cos(angle) * rx * radius,
        y + Math.sin(angle) * ry * radius,
      );
    }
  };

  if (hub) makeSeed(hub, centerX, centerY);
  circles.forEach(({ center, members }, index) => {
    const angle = index * goldenAngle;
    const [offsetX, offsetY] = paperAnchors[index] ?? [
      Math.cos(angle) * 0.57,
      Math.sin(angle) * 0.64,
    ];
    const centered = !hub && circles.length === 1;
    const x = centerX + (centered ? 0 : offsetX * width * 0.49);
    const y = centerY + (centered ? 0 : offsetY * height * 0.57);
    const radius = Math.min(94, 56 + members.length * 6) / zoom;
    const outward = centered ? -0.25 : Math.atan2(y - centerY, x - centerX);
    makeSeed(center, x, y, true);
    placeSatellites(
      members,
      x,
      y,
      radius,
      radius * 0.85,
      outward + (members.length > 1 ? 0.3 : 0),
    );
  });
  const outerScale = circles.length > 0 ? 0.19 : 0.29;
  placeSatellites(
    satellites,
    centerX,
    centerY,
    width * outerScale,
    height * outerScale,
    -1.7,
  );

  const gapY = 68 / zoom;
  const gapLimit = 136 / zoom;
  const ordered = [...seeds];
  for (let step = 0; step < 36; step++) {
    // 在分组的初始位置解开碰撞，让各圈保留自己的视觉中心。
    ordered.sort((a, b) => a.x - b.x);
    for (const [index, a] of ordered.entries()) {
      for (let j = index + 1; j < ordered.length; j++) {
        const b = ordered[j]!;
        const dx = b.x - a.x;
        if (dx > gapLimit) break;
        const dy = b.y - a.y;
        if (Math.abs(dy) >= gapY) continue;
        const gapX = (Math.max(a.labelWidth, b.labelWidth) + 30) / zoom;
        const distance = Math.hypot(dx / gapX, dy / gapY);
        if (distance >= 1) continue;
        const offset = (1 - distance) * 0.37;
        const moveX = (dx / Math.max(distance, 0.025) || gapX * 0.2) * offset;
        const moveY = (dy / Math.max(distance, 0.025) || gapY * 0.1) * offset;
        if (a.node !== hub) {
          const mobility = a.localCenter ? 0.3 : 1;
          a.x -= moveX * mobility;
          a.y -= moveY * mobility;
        }
        if (b.node !== hub) {
          const mobility = b.localCenter ? 0.3 : 1;
          b.x += moveX * mobility;
          b.y += moveY * mobility;
        }
      }
    }
    for (const seed of seeds) {
      const pull = seed.localCenter ? 0.2 : 0.08;
      seed.x = clamp(
        seed.x + (seed.anchorX - seed.x) * pull,
        width * 0.112,
        width * 0.89,
      );
      seed.y = clamp(
        seed.y + (seed.anchorY - seed.y) * pull,
        height * 0.14,
        height * 0.88,
      );
    }
  }
  const distanceOf = ({ x, y }: Seed) =>
    Math.hypot((2 * (x - centerX)) / width, (2 * (y - centerY)) / height);
  const hubDegree = hub ? (links.get(hub.id)?.size ?? 0) : 0;
  const coreDegree = Math.max(3, Math.ceil(hubDegree * 0.375));
  const canDrift = ({ localCenter, node }: Seed) =>
    !localCenter &&
    node !== hub &&
    (links.get(node.id)?.size ?? 0) < coreDegree;
  const outerDistances = seeds
    .filter((seed) => canDrift(seed))
    .map((seed) => distanceOf(seed))
    .sort((a, b) => a - b);
  const driftStart = Math.max(
    0.53,
    outerDistances[Math.floor(outerDistances.length * 0.55)] ?? 0,
  );
  return seeds.map((seed) => {
    const { node, x, y, localCenter } = seed;
    const drift = canDrift(seed)
      ? clamp((distanceOf(seed) - driftStart) / 0.26, 0, 1)
      : 0;
    return { node, x, y, localCenter, drift };
  });
}
