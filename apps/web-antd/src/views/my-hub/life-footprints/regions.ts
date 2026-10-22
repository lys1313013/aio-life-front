import type { SystemRegion } from '#/api/core/system-region';

function groupingName(name: string) {
  return [
    '县',
    '市辖区',
    '省直辖县级行政区划',
    '自治区直辖县级行政区划',
  ].includes(name);
}
export function regionName(path: SystemRegion[]) {
  return path
    .map((item) => item.name)
    .filter(
      (name, index, names) =>
        !groupingName(name) && (index === 0 || name !== names[index - 1]),
    )
    .join('');
}
export function regionCity(path: SystemRegion[]) {
  return (
    path.find((item) => item.level === 2 && !groupingName(item.name))?.name ||
    path[0]?.name ||
    null
  );
}
export function regionAddress(path: SystemRegion[], address: string) {
  const name = regionName(path);
  const value = address.trim();
  return !name || value.startsWith(path[0]?.name || '') ? value : name + value;
}
