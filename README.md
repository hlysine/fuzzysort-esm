<p align="center"><a href="https://raw.github.com/farzher/fuzzysort/master/fuzzysort.js">
  <img src="https://i.imgur.com/axkOMVs.png" alt="fuzzysort" />
</a></p>

<p align="center">
  Fast, Tiny, & Good fuzzy search for JavaScript.
</p>

<p align="center">
  <b>Fast:</b> <b>&lt;1ms</b> to search <b>13,000</b> files.
  <br>
  <b>Tiny:</b> <b>1 file</b>, <b>0 dependencies</b>, <b>5kb</b>.
  <br>
  <b>Good:</b> clean api + sorts results well.
</p>


## [Demo](https://rawgit.com/farzher/fuzzysort/master/test/test.html)

https://rawgit.com/farzher/fuzzysort/master/test/test.html

![](https://i.imgur.com/muaw363.gif)

![](https://i.imgur.com/SXC9A3q.png)

![](https://i.imgur.com/fUkJ7G3.png)

![](https://i.imgur.com/CnVXRbf.png)





## Installation Node

```sh
npm i fuzzysort-esm
```
```js
import fuzzysort from 'fuzzysort-esm'
```



## Installation Browser

```html
<script src="https://cdn.jsdelivr.net/npm/fuzzysort-esm@3.0.1/fuzzysort.min.ejs"></script>
```


## Usage

### `fuzzysort.go(search, targets, options=null)`

```js
const mystuff = [{file: 'Monitor.cpp'}, {file: 'MeshRenderer.cpp'}]
const results = fuzzysort.go('mr', mystuff, {key: 'file'})

// [{score: 0.74, obj: {file: 'MeshRenderer.cpp'}}, {score: 0.28, obj: {file: 'Monitor.cpp'}}]
```

### Options

```js
fuzzysort.go(search, targets, {
  threshold: 0, // Don't return matches worse than this
  limit: 0, // Don't return more results than this
  all: false, // If true, returns all results for an empty search

  key: null, // For when targets are objects (see its example usage)
  keys: null, // For when targets are objects (see its example usage)
  scoreFn: null, // For use with `keys` (see its example usage)
})
```




## What's a `result`

```js
const result = fuzzysort.single('query', 'some string that contains my query.')
result.score       // .80 (1 is a perfect match. 0.5 is a good match. 0 is no match.)
result.target      // 'some string that contains my query.'
result.obj         // reference to your original obj when using options.key
result.indexes     // [29, 30, 31, 32, 33]
result.highlight() // 'some string that contains my <b>query</b>.'
```

#### `result.highlight(open='<b>', close='</b>')`

```js
fuzzysort.single('tt', 'test').highlight('*', '*') // *t*es*t*
```

#### `result.highlight(callback)`
```js
result.highlight((m, i) => <react key={i}>{m}</react>) // [<react key=0>t</react>, 'es', <react key=1>t</react>]
```



### Advanced Usage

Search a list of objects, by multiple complex keys, with custom weights.

```js
let objects = [{
  title: 'Liechi Berry',
  meta: {desc: 'Raises Attack when HP is low.'},
  tags: ['berries', 'items'],
  bookmarked: true,
}, {
  title: 'Petaya Berry',
  meta: {desc: 'Raises Special Attack when HP is low.'},
}]
let results = fuzzysort.go('attack berry', objects, {
  keys: ['title', 'meta.desc', obj => obj.tags?.join()],
  scoreFn: r => r.score * r.obj.bookmarked ? 2 : 1, // if the item is bookmarked, boost its score
})

var keysResult = results[0]
// When using multiple `keys`, results are different. They're indexable to get each normal result
keysResult[0].highlight() // 'Liechi <b>Berry</b>'
keysResult[1].highlight() // 'Raises <b>Attack</b> when HP is low.'
keysResult.score           // .84
keysResult.obj.title       // 'Liechi Berry'
```



## How To Go Fast · Performance Tips

```js
let targets = [{file: 'Monitor.cpp'}, {file: 'MeshRenderer.cpp'}]

// filter out targets that you don't need to search! especially long ones!
targets = targets.filter(t => t.file.length < 1000)

// if your targets don't change often, provide prepared targets instead of raw strings!
targets.forEach(t => t.filePrepared = fuzzysort.prepare(t.file))

// don't use options.key if you don't need a reference to your original obj
targets = targets.map(t => t.filePrepared)

const options = {
  limit: 100, // don't return more results than you need!
  threshold: .5, // don't return bad results
}
fuzzysort.go('gotta', targets, options)
fuzzysort.go('go',    targets, options)
fuzzysort.go('fast',  targets, options)
```


### Gotcha
`result.score` is implemented as a getter/setter and stored different internally
`r.score = .3; // r.score == 0.30000000000000004`





### Changelog

#### v3.0.1

- ESM fork of farzher/fuzzysort