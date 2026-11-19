import type { SchemaRelation, SchemaTable } from '#/api/core/query-schema';

export interface Vector {
  x: number;
  y: number;
  z: number;
}

export interface GraphNode extends Vector {
  color: string;
  degree: number;
  table: SchemaTable;
}

interface Body extends Vector {
  anchor?: Vector;
  force: Vector;
  index: number;
  radius: number;
  velocity: Vector;
}

interface Spring {
  a: Body;
  b: Body;
  length: number;
  strength: number;
}

const colors = [
  '#7e9bff',
  '#6ce1ad',
  '#fcaa72',
  '#c08fff',
  '#ed83ae',
  '#63cced',
  '#f58385',
  '#e6c072',
];
const zero = (): Vector => ({ x: 0, y: 0, z: 0 });

export function randomSource(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 4_294_967_296;
  };
}

function randomOffset(
  random: () => number,
  length: number,
  spatial: boolean,
): Vector {
  const angle = random() * Math.PI * 2;
  const z = spatial ? 2 * random() - 1 : 0;
  const radius = length * Math.sqrt(1 - z * z);
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    z: length * z,
  };
}

function relationWeight(relation: SchemaRelation, reduceUser: boolean) {
  return reduceUser &&
    relation.relationKind === 'owner' &&
    relation.columnMapping.some(
      ({ sourceColumn }) => sourceColumn === 'user_id',
    )
    ? 0.15
    : 1;
}

export function clusterTables(
  tables: SchemaTable[],
  relations: SchemaRelation[],
  reduceUser: boolean,
) {
  const groups = new Map(
    tables.map(({ name }) => [
      name,
      { degree: 0, members: [name], weights: new Map<string, number>() },
    ]),
  );
  let total = 0;
  for (const relation of relations) {
    if (relation.sourceTable === relation.targetTable) continue;
    const from = groups.get(relation.sourceTable);
    const to = groups.get(relation.targetTable);
    if (!from || !to) continue;
    const weight = relationWeight(relation, reduceUser);
    from.weights.set(
      relation.targetTable,
      (from.weights.get(relation.targetTable) ?? 0) + weight,
    );
    to.weights.set(
      relation.sourceTable,
      (to.weights.get(relation.sourceTable) ?? 0) + weight,
    );
    from.degree += weight;
    to.degree += weight;
    total += 2 * weight;
  }

  if (total === 0) return tables.map(({ name }) => [name]);

  // 只合并能明显提高加权模块度的两组。
  for (let merge = 1; merge < tables.length; merge++) {
    let best: [string, string] | undefined;
    let maxGain = 0.15;
    for (const [name, group] of groups) {
      for (const [other, weight] of group.weights) {
        const peer = groups.get(other);
        if (!peer || name >= other) continue;
        const gain = weight - (group.degree * peer.degree) / total;
        if (gain > maxGain) {
          best = [name, other];
          maxGain = gain;
        }
      }
    }
    if (!best) break;
    const [name, other] = best;
    const group = groups.get(name)!;
    const peer = groups.get(other)!;
    group.members.push(...peer.members);
    group.degree += peer.degree;
    group.weights.delete(other);
    for (const [key, weight] of peer.weights) {
      if (key === name) continue;
      const next = (group.weights.get(key) ?? 0) + weight;
      group.weights.set(key, next);
      groups.get(key)?.weights.set(name, next);
      groups.get(key)?.weights.delete(other);
    }
    groups.delete(other);
  }
  return [...groups.values()]
    .map(({ members }) => members)
    .sort((a, b) => b.length - a.length);
}

function settle(
  bodies: Body[],
  springs: Spring[],
  {
    anchor,
    gravity,
    repel,
    rounds,
  }: { anchor: number; gravity: number; repel: number; rounds: number },
) {
  const axes = ['x', 'y', 'z'] as const;
  const steps = Math.min(
    rounds,
    Math.max(30, Math.round(1_600_000 / Math.max(1, bodies.length ** 2))),
  );
  for (let step = 0; step < steps; step++) {
    for (const body of bodies) {
      for (const axis of axes) {
        body.force[axis] =
          -body[axis] * gravity +
          ((body.anchor?.[axis] ?? body[axis]) - body[axis]) * anchor;
      }
    }
    for (const [index, a] of bodies.entries()) {
      for (let j = index + 1; j < bodies.length; j++) {
        const b = bodies[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const squared = dx * dx + dy * dy + dz * dz;
        const distance = Math.max(1, Math.sqrt(squared));
        const push =
          (repel / (squared + 120) +
            Math.max(0, a.radius + b.radius + 8 - distance) * 0.16) /
          distance;
        a.force.x -= dx * push;
        a.force.y -= dy * push;
        a.force.z -= dz * push;
        b.force.x += dx * push;
        b.force.y += dy * push;
        b.force.z += dz * push;
      }
    }
    for (const { a, b, length, strength } of springs) {
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
      const pull = ((distance - length) * strength) / distance;
      for (const axis of axes) {
        const value = pull * (b[axis] - a[axis]);
        a.force[axis] += value;
        b.force[axis] -= value;
      }
    }
    const ceiling = 12 * (1 - step / steps) + 0.6;
    for (const body of bodies) {
      for (const axis of axes) {
        body.velocity[axis] = (body.velocity[axis] + body.force[axis]) * 0.66;
      }
      const speed = Math.hypot(
        body.velocity.x,
        body.velocity.y,
        body.velocity.z,
      );
      const fraction = Math.min(1, ceiling / Math.max(1, speed));
      for (const axis of axes) body[axis] += body.velocity[axis] * fraction;
    }
  }
}

export function arrangeSchema(
  tables: SchemaTable[],
  relations: SchemaRelation[],
  reduceUser: boolean,
  spatial: boolean,
): GraphNode[] {
  if (tables.length === 0) return [];
  const random = randomSource(4711);
  const groups = clusterTables(tables, relations, reduceUser);
  const groupByName = new Map<string, Body>();
  const anchors = groups.map((members, index): Body => {
    const anchor = {
      ...randomOffset(random, 35 + random() * 250, spatial),
      force: zero(),
      index,
      radius: members.length === 1 ? 27 : 30 + Math.sqrt(members.length) * 20,
      velocity: zero(),
    };
    for (const name of members) groupByName.set(name, anchor);
    return anchor;
  });
  const groupEdges = new Map<string, { a: Body; b: Body; weight: number }>();
  const degrees = new Map<string, number>();
  for (const relation of relations) {
    const a = groupByName.get(relation.sourceTable);
    const b = groupByName.get(relation.targetTable);
    if (!a || !b) continue;
    const weight = relationWeight(relation, reduceUser);
    degrees.set(
      relation.sourceTable,
      (degrees.get(relation.sourceTable) || 0) + weight,
    );
    if (relation.sourceTable !== relation.targetTable) {
      degrees.set(
        relation.targetTable,
        (degrees.get(relation.targetTable) || 0) + weight,
      );
    }
    if (a === b) continue;
    const key =
      a.index < b.index ? `${a.index}:${b.index}` : `${b.index}:${a.index}`;
    const edge = groupEdges.get(key) ?? { a, b, weight: 0 };
    edge.weight += weight;
    groupEdges.set(key, edge);
  }
  settle(
    anchors,
    [...groupEdges.values()].map(({ a, b, weight }) => ({
      a,
      b,
      length: a.radius + b.radius + 40 + 72 / (1 + weight),
      strength: 0.054 * Math.min(weight, 3),
    })),
    { anchor: 0, gravity: 0.0055, repel: 14_800, rounds: 180 },
  );
  const bodies = new Map(
    tables.map((table): [string, Body] => {
      const anchor = groupByName.get(table.name)!;
      const offset = randomOffset(
        random,
        anchor.radius * (0.2 + random() * 0.53),
        spatial,
      );
      return [
        table.name,
        {
          anchor,
          force: zero(),
          index: anchor.index,
          radius: 18,
          velocity: zero(),
          x: anchor.x + offset.x,
          y: anchor.y + offset.y,
          z: anchor.z + offset.z,
        },
      ];
    }),
  );
  const points = [...bodies.values()];
  const springs = relations.flatMap((relation): Spring[] => {
    const a = bodies.get(relation.sourceTable);
    const b = bodies.get(relation.targetTable);
    if (!a?.anchor || !b?.anchor || a === b) return [];
    const sameGroup = a.anchor === b.anchor;
    return [
      {
        a,
        b,
        length: sameGroup
          ? 54
          : Math.max(
              85,
              Math.hypot(
                a.anchor.x - b.anchor.x,
                a.anchor.y - b.anchor.y,
                a.anchor.z - b.anchor.z,
              ) * 0.79,
            ),
        strength:
          relationWeight(relation, reduceUser) * (sameGroup ? 0.105 : 0.048),
      },
    ];
  });
  settle(points, springs, {
    anchor: 0.087,
    gravity: 0.0004,
    repel: 535,
    rounds: 230,
  });
  const midpoint = (axis: keyof Vector) =>
    (Math.max(...points.map((node) => node[axis])) +
      Math.min(...points.map((node) => node[axis]))) /
    2;
  const center = { x: midpoint('x'), y: midpoint('y'), z: midpoint('z') };
  const scale =
    1 /
    Math.max(
      1,
      ...points.map(({ x, y, z }) =>
        Math.hypot(x - center.x, y - center.y, z - center.z),
      ),
    );
  return tables.map((table) => {
    const { index, x, y, z } = bodies.get(table.name)!;
    return {
      color:
        groups[index]?.length === 1
          ? '#8b9cb9'
          : colors[index % colors.length]!,
      degree: degrees.get(table.name) ?? 0,
      table,
      x: (x - center.x) * scale,
      y: (y - center.y) * scale,
      z: (z - center.z) * scale,
    };
  });
}
