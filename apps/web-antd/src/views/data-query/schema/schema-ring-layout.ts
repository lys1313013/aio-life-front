import type { SchemaRelation, SchemaTable } from '#/api/core/query-schema';

import { tableLabel } from './schema-options';

type Tone = 'blue' | 'cyan' | 'purple' | 'rose';
type Point = { x: number; y: number };

interface RingDefinition extends Point {
  center: string;
  members: string[];
  start: number;
  tone: Tone;
}

interface RingNode extends Point {
  label: string;
  name: string;
  tone: Tone;
  width: number;
}

interface RingArea extends Point {
  nodes: RingNode[];
  radiusX: number;
  radiusY: number;
  tone: Tone;
}

export const ringNodeHeight = 50;

const prototypeRings: RingDefinition[] = [
  {
    x: 365,
    y: 300,
    start: -100,
    center: 'time_record',
    tone: 'blue',
    members: [
      'time_record',
      'time_tracker_category',
      'exercise_record',
      'read_record',
      'movie',
      'b_video',
      'event_record',
      'life_footprint',
    ],
  },
  {
    x: 1013,
    y: 255,
    start: -74,
    center: 'attachment',
    tone: 'purple',
    members: [
      'attachment',
      'storage_object',
      'external_resource',
      'import_job',
    ],
  },
  {
    x: 1560,
    y: 285,
    start: -108,
    center: 'bank_card',
    tone: 'rose',
    members: [
      'expense',
      'income',
      'bank_card',
      'bank_card_tag_rel',
      'bank_card_cover_template',
      'membership_record',
      'membership_provider',
    ],
  },
  {
    x: 2115,
    y: 375,
    start: -43,
    center: 'device',
    tone: 'cyan',
    members: [
      'device',
      'device_expense',
      'wardrobe_item',
      'wardrobe_category',
      'user_body_profile',
    ],
  },
  {
    x: 400,
    y: 880,
    start: -92,
    center: 'task',
    tone: 'purple',
    members: [
      'goal',
      'task_column',
      'task',
      'task_detail',
      'milestone',
      'anniversary_record',
      'memo',
      'thought',
      'thought_rela_event',
      'honor_category',
      'honor_record',
    ],
  },
  {
    x: 1135,
    y: 840,
    start: -75,
    center: 'user_dict_data',
    tone: 'blue',
    members: [
      'sys_dict_type',
      'sys_dict_data',
      'user_dict_data',
      'sys_menu',
      'sys_config',
      'sys_region',
      'sys_work_calendar',
      'sys_scheduled_job',
      'sys_scheduled_job_log',
      'sys_activity_log',
      'data_export_job',
      'data_export_audit_event',
      'data_export_grant',
      'data_export_coordinator',
    ],
  },
  {
    x: 1640,
    y: 670,
    start: -38,
    center: 'cbti_result',
    tone: 'purple',
    members: ['mbti_result', 'cbti_result', 'cbti_personality'],
  },
  {
    x: 2110,
    y: 929,
    start: -95,
    center: 'feedback',
    tone: 'rose',
    members: [
      'message',
      'feedback',
      'feedback_comment',
      'notification_channel_config',
      'notification_preference',
      'notification_delivery',
      'mail_log',
    ],
  },
  {
    x: 1475,
    y: 1410,
    start: -97,
    center: 'sys_user',
    tone: 'blue',
    members: [
      'sys_user',
      'user_third_party_account',
      'password_vault',
      'api_key',
      'api_key_log',
      'login_log',
      'user_secondary_lock_menu',
      'user_menu_hidden',
      'user_quick_nav',
      'user_home_card_preference',
    ],
  },
];

const innerOffsets = [
  [0, -87],
  [-118, 73],
  [118, 73],
] as const;
const centerLookup = new Map(
  prototypeRings.flatMap(({ members }, index) =>
    members.map((member) => [member, index] as const),
  ),
);

function overlaps(a: RingNode, b: RingNode, dx = 0, dy = 0) {
  return (
    Math.abs(a.x + dx - b.x) < (a.width + b.width) / 2 + 14 &&
    Math.abs(a.y + dy - b.y) < ringNodeHeight + 12
  );
}

function moveArea(area: RingArea, dx: number, dy: number) {
  for (const point of [area, ...area.nodes]) {
    point.x += dx;
    point.y += dy;
  }
}

function avoidEarlierAreas(area: RingArea, placed: RingNode[]) {
  const clear = (dx: number, dy: number) =>
    !area.nodes.some((node) =>
      placed.some((peer) => overlaps(node, peer, dx, dy)),
    );
  if (clear(0, 0)) return;

  // Keep the prototype anchors unless actual table labels need a little more room.
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const;
  for (let distance = 12; ; distance += 12) {
    const direction = directions.find(([x, y]) =>
      clear(x * distance, y * distance),
    );
    if (!direction) continue;
    moveArea(area, direction[0] * distance, direction[1] * distance);
    return;
  }
}

function layoutRing(
  ring: RingDefinition,
  tables: Map<string, SchemaTable>,
): RingArea | undefined {
  const [center, ...names] = [
    ring.center,
    ...ring.members.filter((name) => name !== ring.center),
  ].filter((name) => tables.has(name));
  if (!center) return;

  const { x, y, start, tone } = ring;
  const at = (name: string, nodeX: number, nodeY: number): RingNode => {
    const label = tableLabel(tables.get(name)!);
    return {
      name,
      label,
      tone,
      x: Math.round(nodeX),
      y: Math.round(nodeY),
      width: Math.max(176, 52 + name.length * 7, 52 + label.length * 14),
    };
  };
  const core = [
    at(center, x, y),
    ...(names.length >= 9 ? names.splice(0, 3) : []).map((name, index) => {
      const [dx, dy] = innerOffsets[index]!;
      return at(name, x + dx, y + dy);
    }),
  ];
  const left = core[2];
  const right = core[3];
  if (left && right) {
    const separation = Math.max(
      118,
      Math.ceil((left.width + right.width) / 4 + 7),
    );
    left.x = x - separation;
    right.x = x + separation;
  }

  let radiusX = names.length > 6 ? 246 : names.length > 4 ? 218 : 194;
  let radiusY = names.length > 6 ? 186 : names.length > 4 ? 153 : 126;
  let nodes: RingNode[];
  for (;;) {
    const outer = names.map((name, index) => {
      const angle = (start + (index * 360) / names.length) * (Math.PI / 180);
      return at(
        name,
        x + Math.cos(angle) * radiusX,
        y + Math.sin(angle) * radiusY,
      );
    });
    nodes = [...core, ...outer];
    if (
      !outer.some((node, index) =>
        nodes
          .slice(0, core.length + index)
          .some((peer) => overlaps(node, peer)),
      )
    )
      break;
    radiusX += 12;
    radiusY += 9;
  }

  return { x, y, radiusX: radiusX + 67, radiusY: radiusY + 56, tone, nodes };
}

function pillPort(node: RingNode, toward: Point): Point {
  const dx = toward.x - node.x;
  const dy = toward.y - node.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const vx = dx / distance;
  const vy = dy / distance;
  const radius = ringNodeHeight / 2 + 2;
  const straightHalf = node.width / 2 - ringNodeHeight / 2;
  const hit =
    Math.abs(vx) * radius <= Math.abs(vy) * straightHalf
      ? radius / Math.abs(vy)
      : Math.abs(vx) * straightHalf +
        Math.sqrt(radius ** 2 - (vy * straightHalf) ** 2);
  return { x: node.x + vx * hit, y: node.y + vy * hit };
}

function pathBetween(
  from: RingNode,
  to: RingNode,
  nodes: RingNode[],
  index: number,
  parallel: number,
) {
  if (from === to) {
    const { x } = from;
    const y = from.y - ringNodeHeight / 2;
    const lift = 37 + parallel * 14;
    return `M ${x - 33} ${y} C ${x - 46} ${y - lift}, ${x + 46} ${y - lift}, ${x + 33} ${y - 1}`;
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const initialBend =
    Math.min(82, 14 + distance * 0.07) * (index % 2 ? 1 : -1) + parallel * 22;
  const samples = Math.min(64, Math.max(16, Math.ceil(distance / 20)));
  const obstacles = nodes.filter((node) => node !== from && node !== to);
  const point = ({ x, y }: Point) => `${Math.round(x)} ${Math.round(y)}`;
  let best = { score: Infinity, d: '' };
  for (const bend of [
    initialBend,
    -initialBend,
    ...[68, 145, 245].flatMap((n) => [initialBend + n, initialBend - n]),
  ]) {
    const control = {
      x: (from.x + to.x) / 2 - (dy / distance) * bend,
      y: (from.y + to.y) / 2 + (dx / distance) * bend,
    };
    const start = pillPort(from, control);
    const end = pillPort(to, control);
    let score = Math.abs(bend - initialBend) / 85;
    for (let step = 1; step < samples && score < best.score; step++) {
      const t = step / samples;
      const u = 1 - t;
      const x = u * u * start.x + 2 * u * t * control.x + t * t * end.x;
      const y = u * u * start.y + 2 * u * t * control.y + t * t * end.y;
      if (
        obstacles.some(
          (node) =>
            Math.abs(node.x - x) < node.width / 2 + 5 &&
            Math.abs(node.y - y) < ringNodeHeight / 2 + 6,
        )
      )
        score += 8;
    }
    if (score < best.score)
      best = {
        score,
        d: `M ${point(start)} Q ${point(control)} ${point(end)}`,
      };
  }
  return best.d;
}

export function buildSchemaRing(
  tables: SchemaTable[],
  relations: SchemaRelation[],
) {
  const tablesByName = new Map(tables.map((table) => [table.name, table]));
  const rings = prototypeRings.map((ring) => ({
    ...ring,
    members: [...ring.members],
  }));
  const additions: string[] = [];
  for (const { name } of tables) {
    if (centerLookup.has(name)) continue;
    const scores = new Map<number, number>();
    for (const relation of relations) {
      if (relation.relationKind === 'owner') continue;
      const neighbor =
        relation.sourceTable === name
          ? relation.targetTable
          : relation.targetTable === name
            ? relation.sourceTable
            : '';
      const area = centerLookup.get(neighbor);
      if (area !== undefined) scores.set(area, (scores.get(area) ?? 0) + 1);
    }
    const preferred = [...scores].sort(
      ([a, countA], [b, countB]) => countB - countA || a - b,
    )[0];
    if (preferred) rings[preferred[0]]!.members.push(name);
    else additions.push(name);
  }

  const areas: RingArea[] = [];
  const placed: RingNode[] = [];
  for (const ring of rings) {
    const area = layoutRing(ring, tablesByName);
    if (!area) continue;
    avoidEarlierAreas(area, placed);
    areas.push(area);
    placed.push(...area.nodes);
  }
  // Give tables with no connection to a prototype group space on the same canvas.
  for (let index = 0; index < additions.length; index += 8) {
    const members = additions.slice(index, index + 8);
    const area = layoutRing(
      { center: members[0]!, members, tone: 'cyan', x: 475, y: 0, start: -92 },
      tablesByName,
    )!;
    const top = Math.max(0, ...areas.map(({ y, radiusY }) => y + radiusY));
    const shift = top + area.radiusY + 32;
    moveArea(area, 0, shift);
    areas.push(area);
  }

  const nodes = areas.flatMap((area) => area.nodes);
  const shiftX = Math.max(
    0,
    24 -
      Math.min(
        ...areas.map((area) => area.x - area.radiusX),
        ...nodes.map((node) => node.x - node.width / 2),
      ),
  );
  const shiftY = Math.max(
    0,
    24 -
      Math.min(
        ...areas.map((area) => area.y - area.radiusY),
        ...nodes.map((node) => node.y - ringNodeHeight / 2),
      ),
  );
  for (const area of areas) moveArea(area, shiftX, shiftY);

  const width = Math.ceil(
    Math.max(
      1,
      ...areas.map((area) => area.x + area.radiusX),
      ...nodes.map((node) => node.x + node.width / 2),
    ) + 42,
  );
  const height = Math.ceil(
    Math.max(
      1,
      ...areas.map((area) => area.y + area.radiusY),
      ...nodes.map((node) => node.y + ringNodeHeight / 2),
    ) + 42,
  );
  const nodeByName = new Map(nodes.map((node) => [node.name, node]));
  const routeCounts = new Map<string, number>();
  const edges = relations.flatMap((relation, index) => {
    const from = nodeByName.get(relation.sourceTable);
    const to = nodeByName.get(relation.targetTable);
    if (!from || !to) return [];
    const pair = [from.name, to.name].sort().join(':');
    const parallel = routeCounts.get(pair) ?? 0;
    routeCounts.set(pair, parallel + 1);
    return [{ relation, d: pathBetween(from, to, nodes, index, parallel) }];
  });
  return { areas, edges, height, nodeByName, nodes, width };
}
