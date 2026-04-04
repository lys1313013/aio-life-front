import { compare } from 'fast-string-compare';
export function uniq(arr) {
    return [...new Set(arr)];
}
export function uniqArrays(arrays) {
    const known = [];
    return arrays
        .filter(array => {
        const isKnown = known.some(arr => !arrayCompare(arr, array));
        if (isKnown)
            return false;
        known.push(array);
        return true;
    });
}
export function arrayCompare(a, b) {
    if (a.length !== b.length)
        return a.length > b.length ? 1 : -1;
    else if (a.length === 0)
        return 0;
    for (let i = 0; i < a.length; ++i) {
        const diff = compare(a[i], b[i]);
        if (diff !== 0)
            return diff;
    }
    return 0;
}
function sortArrays(arr) {
    return [...arr].sort((a, b) => {
        if (a.length < b.length)
            return -1;
        else if (a.length > b.length)
            return 1;
        else
            return compare(JSON.stringify(a), JSON.stringify(b));
    });
}
export function rotateArray(arr, offset) {
    return [...arr.slice(offset), ...arr.slice(0, offset)];
}
function rotationSort(arr) {
    const anchor = [...arr].sort(compare)[0];
    while (arr[0] !== anchor)
        arr = rotateArray(arr, 1);
    return [...arr];
}
function rotationSortArrays(arrays) {
    return arrays.map(arr => rotationSort(arr));
}
export function sortFullAnalysisResult(result) {
    return {
        cycles: sortArrays(rotationSortArrays(result.cycles)),
        entrypoints: sortArrays(result.entrypoints),
        dependencies: [...result.dependencies].sort(compare),
        dependents: [...result.dependents].sort(compare),
        all: [...result.all].sort(compare),
    };
}
export function sortFastAnalysisResult(result) {
    return {
        cyclic: [...result.cyclic].sort(compare),
        dependencies: [...result.dependencies].sort(compare),
        dependents: [...result.dependents].sort(compare),
    };
}
