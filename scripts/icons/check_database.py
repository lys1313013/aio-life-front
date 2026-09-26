"""Read-only inventory of database icon references versus generated local assets."""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]


def read_env(path):
    values = {}
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.removeprefix("export ").split("=", 1)
            values[key.strip()] = value.strip().strip("\"'")
    return {**values, **os.environ}


def covered_icons():
    generated = ROOT / "packages/@core/base/icons/src/local-icons/generated"
    manifest = json.loads((generated / "manifest.json").read_text())
    collections = json.loads((generated / "base.json").read_text())
    for item in manifest["collections"]:
        collections.append(json.loads((generated / f"{item['prefix']}.json").read_text()))
    names = set()
    for collection in collections:
        for name in set(collection["icons"]) | set(collection.get("aliases", {})):
            names.add(f"{collection['prefix']}:{name}")
    names.update(f"svg:{path.stem}" for path in (ROOT / "packages/icons/src/svg/icons").glob("*.svg"))
    return names


def quote_identifier(name):
    if not re.fullmatch(r"[a-zA-Z0-9_]+", name):
        raise ValueError("Unsupported SQL identifier")
    return f"`{name}`"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=ROOT.parent / ".env")
    args = parser.parse_args()
    try:
        import pymysql
    except ImportError:
        print("缺少 PyMySQL：请先运行 python3 -m pip install PyMySQL", file=sys.stderr)
        return 2
    env = read_env(args.env_file)
    if not env.get("AIO_LIFE_DB_URL") or not env.get("AIO_LIFE_DB_PASSWORD"):
        print("需要配置 AIO_LIFE_DB_URL 和 AIO_LIFE_DB_PASSWORD；环境变量优先于 --env-file。", file=sys.stderr)
        return 2
    address = urlsplit(f"mysql://{env['AIO_LIFE_DB_URL']}")
    local = covered_icons()
    references = defaultdict(list)
    ignored = set()
    connection = pymysql.connect(
        host=address.hostname,
        port=address.port or 3306,
        user=env.get("AIO_LIFE_DB_USERNAME", "aio_life"),
        password=env["AIO_LIFE_DB_PASSWORD"],
        database=env.get("AIO_LIFE_DB_NAME", "aio_life"),
        charset="utf8mb4",
        connect_timeout=10,
        read_timeout=20,
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET SESSION TRANSACTION READ ONLY")
            cursor.execute("START TRANSACTION WITH CONSISTENT SNAPSHOT")
            cursor.execute("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()")
            tables = defaultdict(set)
            for row in cursor.fetchall():
                tables[row["TABLE_NAME"]].add(row["COLUMN_NAME"])
            for table, columns in sorted(tables.items()):
                for column in sorted(columns):
                    if "icon" not in column.lower() and (table, column) != ("sys_menu", "meta"):
                        continue
                    expression = quote_identifier(column)
                    if (table, column) == ("sys_menu", "meta"):
                        expression = "JSON_UNQUOTE(JSON_EXTRACT(`meta`, '$.icon'))"
                    active = "`is_deleted` = 0 AND " if "is_deleted" in columns else ""
                    cursor.execute(
                        f"SELECT {expression} AS icon, COUNT(*) AS n FROM {quote_identifier(table)} "
                        f"WHERE {active}{expression} IS NOT NULL AND TRIM({expression}) <> '' GROUP BY {expression}"
                    )
                    for row in cursor.fetchall():
                        icon = row["icon"]
                        if not re.fullmatch(r"[a-z0-9-]+:[a-z0-9-]+", icon):
                            ignored.add(icon)
                            continue
                        references[icon].append({"field": f"{table}.{column}", "count": row["n"]})
    finally:
        connection.rollback()
        connection.close()
    missing = {name: references[name] for name in sorted(references.keys() - local)}
    print(json.dumps({
        "scope": "全库未删除记录的 icon 字段和 sys_menu.meta.icon",
        "used_icons": len(references),
        "covered_icons": len(references.keys() & local),
        "non_iconify_values": len(ignored),
        "missing": missing,
    }, ensure_ascii=False, indent=2))
    return 1 if missing else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        # Do not print connection strings, passwords, or exception arguments.
        print(f"检查失败：{type(error).__name__}，请检查依赖、生成资源和数据库连接配置。", file=sys.stderr)
        sys.exit(2)
