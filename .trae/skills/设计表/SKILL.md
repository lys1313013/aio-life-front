---
name: 设计表
description: 设计表结构时
---

创建表时，永远要有以下字段：

```
  id bigint NOT NULL,
  user_id bigint NOT NULL,
  create_user bigint NOT NULL,
  create_time timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  update_user bigint NOT NULL,
  update_time timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  is_deleted smallint NOT NULL DEFAULT 0
```

主键由应用雪花算法生成，不使用自增；审计时间由应用显式维护，不使用 ON UPDATE；中文注释使用 `COMMENT ON TABLE/COLUMN`。
