[![npm version][npm-image]][npm-url]
[![downloads][downloads-image]][npm-url]
[![build status][build-image]][build-url]
[![coverage status][coverage-image]][coverage-url]
[![Node.JS version][node-version]][node-url]


# rotated-array-set

`RotatedArraySet` is a class looking a bit like the built-in [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) but is a set of arrays of `T`, and treats rotated arrays as "same".


# API

Construct a `RotatedArraySet`, optionally provide a *stringify* method, converting `T` to `string` (this is not necessary for primitive types).


## Versions

 * Since v2 this is a [pure ESM][pure-esm] package, and requires Node.js >=12.20. It cannot be used from CommonJS.
 * Since v3 requires Node.js >= 14.13.1.


## Example

```ts
import { RotatedArraySet } from 'rotated-array-set'

const tree = new RotatedArraySet< string >( );

tree.insert( [ 'a', 'b', 'c' ] );
tree.insert( [ 'x', 'y' ] );
tree.insert( [ 'c', 'a', 'b' ] ); // won't insert, already has this but rotated
tree.insert( [ 'y', 'x' ] ); // won't insert, same reason

tree.has( [ 'b', 'c', 'a' ] ); // true
tree.has( [ 'c', 'b', 'a' ] ); // false - this isn't *rotated*

tree.values( ); // [ [ 'a', 'b', 'c' ], [ 'x', 'y' ] ]
```

Provide a custom stringifier:

```ts
import { RotatedArraySet } from 'rotated-array-set'

const tree = new RotatedArraySet< User >( user => `${user.first} ${user.last}` );

tree.insert( [ user1, user2, user3 ] );
tree.insert( [ user3, user1, user2 ] ); // won't insert, already has this but rotated

tree.has( [ user2, user3, user1 ] ); // true
tree.has( [ user3, user2, user1 ] ); // false - not *rotated*

tree.values( ); // [ [ user1, user2, user3 ] ]
```


[npm-image]: https://img.shields.io/npm/v/rotated-array-set.svg
[npm-url]: https://npmjs.org/package/rotated-array-set
[downloads-image]: https://img.shields.io/npm/dm/rotated-array-set.svg
[build-image]: https://img.shields.io/github/actions/workflow/status/grantila/rotated-array-set/master.yml?branch=master
[build-url]: https://github.com/grantila/rotated-array-set/actions?query=workflow%3AMaster
[coverage-image]: https://coveralls.io/repos/github/grantila/rotated-array-set/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/grantila/rotated-array-set?branch=master
[node-version]: https://img.shields.io/node/v/rotated-array-set
[node-url]: https://nodejs.org/en/
[pure-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
