import { describe, expect, it } from 'vitest';

import { initialToolArguments } from './arguments';

describe('工具表单更新范围', () => {
  it('完成待办或只改目标进度时不默认写入其他可选枚举', () => {
    const properties = {
      id: { type: 'string' },
      priority: { type: 'integer', enum: [1, 10, 20] },
      status: { type: 'string', enum: ['in_progress', 'completed', 'on_hold'] },
      isCompleted: { type: 'integer' },
    };
    const args = initialToolArguments(properties);
    args.id = '9007199254740993';
    args.isCompleted = 1;
    expect(args).toEqual({ id: '9007199254740993', isCompleted: 1 });
  });

  it('保留明确声明的零和false默认值', () => {
    expect(
      initialToolArguments({
        offset: { default: 0 },
        enabled: { default: false },
      }),
    ).toEqual({ offset: 0, enabled: false });
  });
});
