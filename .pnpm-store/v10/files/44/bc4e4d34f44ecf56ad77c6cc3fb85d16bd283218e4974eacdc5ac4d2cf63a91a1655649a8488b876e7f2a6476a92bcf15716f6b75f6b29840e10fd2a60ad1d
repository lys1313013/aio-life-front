[![npm version][npm-image]][npm-url]
[![downloads][downloads-image]][npm-url]
[![build status][build-image]][build-url]
[![coverage status][coverage-image]][coverage-url]
[![Node.JS version][node-version]][node-url]


# short-tree

`ShortTree` is a class extending `RBTree` from [bintrees][bintrees-npm-url], and **works explicitly on nodes of arrays**.

The `ShortTree< T >` class extends `RBTree< Array< T > >`.

`insert` is overloaded and behaves differently. When adding a node, it will first check if there is another shorter node being the beginning of the to-be-inserted node, and if so, won't insert. It also checks if there are existing longer nodes which begin with the newly inserted node, and deletes them.

A new function is added `values()` which returns `Array< Array< T > >`, i.e. an array of all nodes (and again, each node is an array of `T`).


## Versions

 * Since v2 this is a [pure ESM][pure-esm] package, and requires Node.js >=12.20. It cannot be used from CommonJS.
 * Since v3 requires Node.js >= 14.13.1.


# Algorithm


When inserting `[ 'a', 'b', 'c', 'd' ]`, **one** node is inserted with this value.

Inserting  `[ 'x', 'y' ]`, will insert **one** new node.

If later, `[ 'a', 'b', 'c', 'd', 'e' ]` is inserted, it won't be - there's already a "shorter" version of this node (the first one inserted).

If later, `[ 'a', 'b' ]` is inserted, the first node `[ 'a', 'b', 'c', 'd' ]` will be removed (or "chopped off" after `b`).


# API

Construct a `ShortTree` by giving the comparison function for `T`.

If `T` is `number` e.g., this could be `(a, b) => a - b`.


## Order

The order when traversing the values is going to depend on the comparison function provided to the constructor.

E.g. a traditional `(a: string, b: string) => a.localeCompare(b)` will ensure an order for your current locale. You can use `Intl` to define string comparison orders for other situations.

If the *human friendly* order isn't that important, but speed is critical, use [`fast-string-compare`][fast-string-compare-npm-url].


## Example

```ts
import { compare } from 'fast-string-compare'
import { ShortTree } from 'short-tree'

// T is deduced to {string}
const tree = new ShortTree( compare );

tree.insert( [ 'a', 'b', 'c', 'd' ] );
tree.insert( [ 'x', 'y' ] );
// This will "chop off" (i.e. remove) [ 'a', 'b', 'c', 'd' ]
tree.insert( [ 'a', 'b' ] );

tree.values( ); // [ [ 'a', 'b' ], [ 'x', 'y' ] ]
```


[npm-image]: https://img.shields.io/npm/v/short-tree.svg
[npm-url]: https://npmjs.org/package/short-tree
[downloads-image]: https://img.shields.io/npm/dm/short-tree.svg
[build-image]: https://img.shields.io/github/actions/workflow/status/grantila/short-tree/master.yml?branch=master
[build-url]: https://github.com/grantila/short-tree/actions?query=workflow%3AMaster
[coverage-image]: https://coveralls.io/repos/github/grantila/short-tree/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/grantila/short-tree?branch=master
[node-version]: https://img.shields.io/node/v/short-tree
[node-url]: https://nodejs.org/en/

[bintrees-npm-url]: https://npmjs.org/package/bintrees
[fast-string-compare-npm-url]: https://npmjs.org/package/fast-string-compare
[pure-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
