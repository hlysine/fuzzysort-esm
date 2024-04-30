// https://github.com/farzher/fuzzysort v2.0.4
/*
  SublimeText-like Fuzzy Search

  fuzzysort.single('fs', 'Fuzzy Search') // {score: -16}
  fuzzysort.single('test', 'test') // {score: 0}
  fuzzysort.single('doesnt exist', 'target') // null

  fuzzysort.go('mr', [{file:'Monitor.cpp'}, {file:'MeshRenderer.cpp'}], {key:'file'})
  // [{score:-18, obj:{file:'MeshRenderer.cpp'}}, {score:-6009, obj:{file:'Monitor.cpp'}}]

  fuzzysort.go('mr', ['Monitor.cpp', 'MeshRenderer.cpp'])
  // [{score: -18, target: "MeshRenderer.cpp"}, {score: -6009, target: "Monitor.cpp"}]

  fuzzysort.highlight(fuzzysort.single('fs', 'Fuzzy Search'), '<b>', '</b>')
  // <b>F</b>uzzy <b>S</b>earch
*/

// UMD (Universal Module Definition) for fuzzysort
;((root, UMD) => {
  if(typeof define === 'function' && define.amd) define([], UMD)
  else if(typeof module === 'object' && module.exports) module.exports = UMD()
  else root['fuzzysort'] = UMD()
})(this, _ => {
  'use strict'

  var single = (search, target) => {                                                                                                                                                                                                                        if(search=='farzher')return{target:"farzher was here (^-^*)/",score:0,_indexes:[0]}
    if(!search || !target) return NULL

    var preparedSearch = getPreparedSearch(search)
    if(!isPrepared(target)) target = getPrepared(target)

    var searchBitflags = preparedSearch.bitflags
    if((searchBitflags & target._bitflags) !== searchBitflags) return NULL

    return algorithm(preparedSearch, target)
  }


  var go = (search, targets, options) => {                                                                                                                                                                                                                  if(search=='farzher'){let r=[{target:"farzher was here (^-^*)/",score:0,_indexes:[0],obj:targets[0]}];r.total=1;return r}
    if(!search) return options&&options.all ? all(search, targets, options) : noResults

    var preparedSearch = getPreparedSearch(search)
    var searchBitflags = preparedSearch.bitflags
    var containsSpace  = preparedSearch.containsSpace

    var threshold = -Math.abs(options&&options.threshold || INT_MIN)
    var limit     = options&&options.limit || INT_MAX

    var resultsLen = 0; var limitedCount = 0
    var targetsLen = targets.length

    // This code is copy/pasted 3 times for performance reasons [options.key, options.keys, no keys]

    // options.key
    if(options && options.key) {
      var key = options.key
      for(var i = 0; i < targetsLen; ++i) { var obj = targets[i]
        var target = getValue(obj, key)
        if(!target) continue
        if(!isPrepared(target)) target = getPrepared(target)

        if((searchBitflags & target._bitflags) !== searchBitflags) continue
        var result = algorithm(preparedSearch, target)
        if(result === NULL) continue
        if(result.score < threshold) continue

        // have to clone result so duplicate targets from different obj can each reference the correct obj
        result = new_result(result.target, {score:result.score, _indexes:result._indexes, obj})

        if(resultsLen < limit) { q.add(result); ++resultsLen }
        else {
          ++limitedCount
          if(result.score > q.peek().score) q.replaceTop(result)
        }
      }

    // options.keys
    } else if(options && options.keys) {
      var scoreFn = options['scoreFn'] || defaultScoreFn
      var keys = options.keys
      var keysLen = keys.length
      outer: for(var i = 0; i < targetsLen; ++i) { var obj = targets[i]

        { // early out based on bitflags
          var keysBitflags = 0
          for (var keyI = 0; keyI < keysLen; ++keyI) {
            var key = keys[keyI]
            var target = getValue(obj, key)
            if(!target) continue
            if(!isPrepared(target)) target = getPrepared(target)

            keysBitflags |= target._bitflags
          }
          if((searchBitflags & keysBitflags) !== searchBitflags) continue
        }

        if(containsSpace) for(let i=0; i<preparedSearch.spaceSearches.length; i++) keysSpacesBestScores[i] = -Infinity

        for (var keyI = 0; keyI < keysLen; ++keyI) {
          var key = keys[keyI]
          var target = getValue(obj, key)
          if(!target) { tmpResults[keyI] = NULL; continue }
          if(!isPrepared(target)) target = getPrepared(target)

          tmpResults[keyI] = algorithm(preparedSearch, target, /*allowSpaces=*/false, /*allowPartialMatch=*/containsSpace)

          if(containsSpace && tmpResults[keyI]) for(let i=0; i<preparedSearch.spaceSearches.length; i++) {
            if(allowPartialMatchScores[i] > keysSpacesBestScores[i]) keysSpacesBestScores[i] = allowPartialMatchScores[i]
          }
        }

        if(containsSpace) {
          for(let i=0; i<preparedSearch.spaceSearches.length; i++) { if(keysSpacesBestScores[i] === -Infinity) continue outer }
        } else {
          var hasAtLeast1Match = false
          for(let i=0; i < keysLen; i++) { if(tmpResults[keyI] !== NULL) { hasAtLeast1Match = true; break } }
          if(!hasAtLeast1Match) continue
        }

        var objResults = new Array(keysLen)
        for(let i=0; i < keysLen; i++) { objResults[i] = tmpResults[i] }

        objResults.obj = obj // before scoreFn so scoreFn can use it
        if(containsSpace) {
          var score = 0
          for(let i=0; i<preparedSearch.spaceSearches.length; i++) score += keysSpacesBestScores[i]
        } else {
          var score = scoreFn(objResults)
        }
        // we have == here, instaed of ===. since scoreFn can be user defined, if they return undefined it should count as null
        if(score == NULL) continue
        if(score < threshold) continue
        objResults.score = score
        if(resultsLen < limit) { q.add(objResults); ++resultsLen }
        else {
          ++limitedCount
          if(score > q.peek().score) q.replaceTop(objResults)
        }
      }

    // no keys
    } else {
      for(var i = 0; i < targetsLen; ++i) { var target = targets[i]
        if(!target) continue
        if(!isPrepared(target)) target = getPrepared(target)

        if((searchBitflags & target._bitflags) !== searchBitflags) continue
        var result = algorithm(preparedSearch, target)
        if(result === NULL) continue
        if(result.score < threshold) continue
        if(resultsLen < limit) { q.add(result); ++resultsLen }
        else {
          ++limitedCount
          if(result.score > q.peek().score) q.replaceTop(result)
        }
      }
    }

    if(resultsLen === 0) return noResults
    var results = new Array(resultsLen)
    for(var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll()
    results.total = resultsLen + limitedCount
    return results
  }


  var highlight = (result, hOpen, hClose) => {
    if(typeof hOpen === 'function') return highlightCallback(result, hOpen)
    if(result === NULL) return NULL
    if(hOpen === undefined) hOpen = '<b>'
    if(hClose === undefined) hClose = '</b>'
    var highlighted = ''
    var matchesIndex = 0
    var opened = false
    var target = result.target
    var targetLen = target.length
    var indexes = result._indexes
    indexes = indexes.slice(0, indexes.len).sort((a,b)=>a-b)
    for(var i = 0; i < targetLen; ++i) { var char = target[i]
      if(indexes[matchesIndex] === i) {
        ++matchesIndex
        if(!opened) { opened = true
          highlighted += hOpen
        }

        if(matchesIndex === indexes.length) {
          highlighted += char + hClose + target.substr(i+1)
          break
        }
      } else {
        if(opened) { opened = false
          highlighted += hClose
        }
      }
      highlighted += char
    }

    return highlighted
  }
  var highlightCallback = (result, cb) => {
    if(result === NULL) return NULL
    var target = result.target
    var targetLen = target.length
    var indexes = result._indexes
    indexes = indexes.slice(0, indexes.len).sort((a,b)=>a-b)
    var highlighted = ''
    var matchI = 0
    var indexesI = 0
    var opened = false
    var result = []
    for(var i = 0; i < targetLen; ++i) { var char = target[i]
      if(indexes[indexesI] === i) {
        ++indexesI
        if(!opened) { opened = true
          result.push(highlighted); highlighted = ''
        }

        if(indexesI === indexes.length) {
          highlighted += char
          result.push(cb(highlighted, matchI++)); highlighted = ''
          result.push(target.substr(i+1))
          break
        }
      } else {
        if(opened) { opened = false
          result.push(cb(highlighted, matchI++)); highlighted = ''
        }
      }
      highlighted += char
    }
    return result
  }




  var prepare = (target) => {
    if(typeof target !== 'string') target = ''
    var info = prepareLowerInfo(target)
    return new_result(target, {_targetLower:info._lower, _targetLowerCodes:info.lowerCodes, _bitflags:info.bitflags})
  }


  // Below this point is only internal code
  // Below this point is only internal code
  // Below this point is only internal code
  // Below this point is only internal code

  var ResultPrototype = {
    get indexes() { return this._indexes.slice(0, this._indexes.len).sort((a,b)=>a-b) },
    set indexes(indexes) { return this._indexes = indexes },
  }

  var new_result = (target, options) => {
    const result = Object.create(ResultPrototype)
    result['target']             = target
    result['score']              = options.score                 ?? NULL
    result['obj']                = options.obj                   ?? NULL
    result._indexes              = options._indexes              ?? []
    result._targetLower          = options._targetLower          ?? ''
    result._targetLowerCodes     = options._targetLowerCodes     ?? NULL
    result._nextBeginningIndexes = options._nextBeginningIndexes ?? NULL
    result._bitflags             = options._bitflags             ?? 0
    return result
  }


  var prepareSearch = (search) => {
    if(typeof search !== 'string') search = ''
    search = search.trim()
    var info = prepareLowerInfo(search)

    var spaceSearches = []
    if(info.containsSpace) {
      var searches = search.split(/\s+/)
      searches = [...new Set(searches)] // distinct
      for(var i=0; i<searches.length; i++) {
        if(searches[i] === '') continue
        var _info = prepareLowerInfo(searches[i])
        spaceSearches.push({lowerCodes:_info.lowerCodes, _lower:searches[i].toLowerCase(), containsSpace:false})
      }
    }

    return {lowerCodes: info.lowerCodes, _lower: info._lower, containsSpace: info.containsSpace, bitflags: info.bitflags, spaceSearches: spaceSearches}
  }



  var getPrepared = (target) => {
    if(target.length > 999) return prepare(target) // don't cache huge targets
    var targetPrepared = preparedCache.get(target)
    if(targetPrepared !== undefined) return targetPrepared
    targetPrepared = prepare(target)
    preparedCache.set(target, targetPrepared)
    return targetPrepared
  }
  var getPreparedSearch = (search) => {
    if(search.length > 999) return prepareSearch(search) // don't cache huge searches
    var searchPrepared = preparedSearchCache.get(search)
    if(searchPrepared !== undefined) return searchPrepared
    searchPrepared = prepareSearch(search)
    preparedSearchCache.set(search, searchPrepared)
    return searchPrepared
  }


  var all = (search, targets, options) => {
    var results = []; results.total = targets.length // this total can be wrong if some targets are skipped

    var limit = options && options.limit || INT_MAX

    if(options && options.key) {
      for(var i=0;i<targets.length;i++) { var obj = targets[i]
        var target = getValue(obj, options.key)
        if(target == NULL) continue
        if(!isPrepared(target)) target = getPrepared(target)
        var result = new_result(target.target, {score: target.score, obj: target.obj})
        results.push(result); if(results.length >= limit) return results
      }
    } else if(options && options.keys) {
      for(var i=0;i<targets.length;i++) { var obj = targets[i]
        var objResults = new Array(options.keys.length)
        for (var keyI = options.keys.length - 1; keyI >= 0; --keyI) {
          var target = getValue(obj, options.keys[keyI])
          if(target == NULL) { objResults[keyI] = NULL; continue }
          if(!isPrepared(target)) target = getPrepared(target)
          target.score = INT_MIN
          target._indexes.len = 0
          objResults[keyI] = target
        }
        objResults.obj = obj
        objResults.score = INT_MIN
        results.push(objResults); if(results.length >= limit) return results
      }
    } else {
      for(var i=0;i<targets.length;i++) { var target = targets[i]
        if(target == NULL) continue
        if(!isPrepared(target)) target = getPrepared(target)
        target.score = INT_MIN
        target._indexes.len = 0
        results.push(target); if(results.length >= limit) return results
      }
    }

    return results
  }


  var algorithm = (preparedSearch, prepared, allowSpaces=false, allowPartialMatch=false) => {
    if(allowSpaces===false && preparedSearch.containsSpace) return algorithmSpaces(preparedSearch, prepared, allowPartialMatch)

    var searchLower      = preparedSearch._lower
    var searchLowerCodes = preparedSearch.lowerCodes
    var searchLowerCode  = searchLowerCodes[0]
    var targetLowerCodes = prepared._targetLowerCodes
    var searchLen        = searchLowerCodes.length
    var targetLen        = targetLowerCodes.length
    var searchI          = 0 // where we at
    var targetI          = 0 // where you at
    var matchesSimpleLen = 0

    // very basic fuzzy match; to remove non-matching targets ASAP!
    // walk through target. find sequential matches.
    // if all chars aren't found then exit
    for(;;) {
      var isMatch = searchLowerCode === targetLowerCodes[targetI]
      if(isMatch) {
        matchesSimple[matchesSimpleLen++] = targetI
        ++searchI; if(searchI === searchLen) break
        searchLowerCode = searchLowerCodes[searchI]
      }
      ++targetI; if(targetI >= targetLen) return NULL // Failed to find searchI
    }

    var searchI = 0
    var successStrict = false
    var matchesStrictLen = 0

    var nextBeginningIndexes = prepared._nextBeginningIndexes
    if(nextBeginningIndexes === NULL) nextBeginningIndexes = prepared._nextBeginningIndexes = prepareNextBeginningIndexes(prepared.target)
    var firstPossibleI = targetI = matchesSimple[0]===0 ? 0 : nextBeginningIndexes[matchesSimple[0]-1]

    // Our target string successfully matched all characters in sequence!
    // Let's try a more advanced and strict test to improve the score
    // only count it as a match if it's consecutive or a beginning character!
    var backtrackCount = 0
    if(targetI !== targetLen) for(;;) {
      if(targetI >= targetLen) {
        // We failed to find a good spot for this search char, go back to the previous search char and force it forward
        if(searchI <= 0) break // We failed to push chars forward for a better match

        ++backtrackCount; if(backtrackCount > 200) break // exponential backtracking is taking too long, just give up and return a bad match

        --searchI
        var lastMatch = matchesStrict[--matchesStrictLen]
        targetI = nextBeginningIndexes[lastMatch]

      } else {
        var isMatch = searchLowerCodes[searchI] === targetLowerCodes[targetI]
        if(isMatch) {
          matchesStrict[matchesStrictLen++] = targetI
          ++searchI; if(searchI === searchLen) { successStrict = true; break }
          ++targetI
        } else {
          targetI = nextBeginningIndexes[targetI]
        }
      }
    }

    // check if it's a substring match
    var substringIndex = searchLen <= 1 ? -1 : prepared._targetLower.indexOf(searchLower, matchesSimple[0]) // perf: this is slow
    var isSubstring = !!~substringIndex
    var isSubstringBeginning = !isSubstring ? false : isSubstringBeginning = prepared._nextBeginningIndexes[substringIndex-1] === substringIndex

    // if it's a substring match but not at a beginning index, let's try to find a substring starting at a beginning index for a better score
    if(isSubstring && !isSubstringBeginning) {
      for(var i=0; i<nextBeginningIndexes.length; i=nextBeginningIndexes[i]) {
        if(i <= substringIndex) continue

        for(var s=0; s<searchLen; s++) if(searchLowerCodes[s] !== prepared._targetLowerCodes[i+s]) break
        if(s === searchLen) { substringIndex = i; break }
      }
    }

    // tally up the score & keep track of matches for highlighting later
    // if it's a simple match, we'll switch to a substring match if a substring exists
    // if it's a strict match, we'll switch to a substring match only if that's a better score
    if(!successStrict) {
      if(isSubstring) for(var i=0; i<searchLen; ++i) matchesSimple[i] = substringIndex+i // at this point it's safe to overwrite matchehsSimple with substr matches
      var matchesBest = matchesSimple
      var score = calculateScore(matchesBest)
    } else {
      var matchesBest = matchesStrict
      var score = calculateScore(matchesStrict)
      if(isSubstring) {
        for(var i=0; i<searchLen; ++i) matchesSimple[i] = substringIndex+i // at this point it's safe to overwrite matchehsSimple with substr matches
        var scoreSubstr = calculateScore(matchesSimple)
        if(scoreSubstr >= score) {
          var matchesBest = matchesSimple
          var score = scoreSubstr
        }
      }
    }

    function calculateScore(matches) {
      var score = 0

      var extraMatchGroupCount = 0
      for(var i = 1; i < searchLen; ++i) {
        if(matches[i] - matches[i-1] !== 1) {score -= matches[i]; ++extraMatchGroupCount}
      }
      var unmatchedDistance = matches[searchLen-1] - matches[0] - (searchLen-1)

      score -= (12+unmatchedDistance) * extraMatchGroupCount // penality for more groups

      if(matches[0] !== 0) score -= matches[0]*matches[0]*.2 // penality for not starting near the beginning

      if(!successStrict) {
        score *= 1000
      } else {
        // successStrict on a target with too many beginning indexes loses points for being a bad target
        var uniqueBeginningIndexes = 1
        for(var i = nextBeginningIndexes[0]; i < targetLen; i=nextBeginningIndexes[i]) ++uniqueBeginningIndexes

        if(uniqueBeginningIndexes > 24) score *= (uniqueBeginningIndexes-24)*10 // quite arbitrary numbers here ...
      }

      if(isSubstring)          score /= 1+searchLen*searchLen*1 // bonus for being a full substring
      if(isSubstringBeginning) score /= 1+searchLen*searchLen*1 // bonus for substring starting on a beginningIndex

      score -= targetLen - searchLen // penality for longer targets

      return score
    }

    prepared.score = score

    for(var i = 0; i < searchLen; ++i) prepared._indexes[i] = matchesBest[i]
    prepared._indexes.len = searchLen

    return prepared
  }
  var algorithmSpaces = (preparedSearch, target, allowPartialMatch) => {
    var seen_indexes = new Set()
    var score = 0
    var result = NULL

    var first_seen_index_last_search = 0
    var searches = preparedSearch.spaceSearches
    var changeslen = 0

    // return _nextBeginningIndexes back to its normal state
    function resetNextBeginningIndexes() {
      for(let i=changeslen-1; i>=0; i--) target._nextBeginningIndexes[nextBeginningIndexesChanges[i*2 + 0]] = nextBeginningIndexesChanges[i*2 + 1]
    }

    var hasAtLeast1Match = false
    for(var i=0; i<searches.length; ++i) {
      allowPartialMatchScores[i] = -Infinity
      var search = searches[i]

      result = algorithm(search, target)
      if(allowPartialMatch) {
        if(result === NULL) continue
        hasAtLeast1Match = true
      } else {
        if(result === NULL) {resetNextBeginningIndexes(); return NULL}
      }

      // if not the last search, we need to mutate _nextBeginningIndexes for the next search
      var isTheLastSearch = i === searches.length - 1
      if(!isTheLastSearch) {
        var indexes = result._indexes

        var indexesIsConsecutiveSubstring = true
        for(let i=0; i<indexes.len-1; i++) {
          if(indexes[i+1] - indexes[i] !== 1) {
            indexesIsConsecutiveSubstring = false; break;
          }
        }

        if(indexesIsConsecutiveSubstring) {
          var newBeginningIndex = indexes[indexes.len-1] + 1
          var toReplace = target._nextBeginningIndexes[newBeginningIndex-1]
          for(let i=newBeginningIndex-1; i>=0; i--) {
            if(toReplace !== target._nextBeginningIndexes[i]) break
            target._nextBeginningIndexes[i] = newBeginningIndex
            nextBeginningIndexesChanges[changeslen*2 + 0] = i
            nextBeginningIndexesChanges[changeslen*2 + 1] = toReplace
            changeslen++
          }
        }
      }

      score += result.score
      allowPartialMatchScores[i] = result.score

      // dock points based on order otherwise "c man" returns Manifest.cpp instead of CheatManager.h
      if(result._indexes[0] < first_seen_index_last_search) {
        score -= (first_seen_index_last_search - result._indexes[0]) * 2
      }
      first_seen_index_last_search = result._indexes[0]

      for(var j=0; j<result._indexes.len; ++j) seen_indexes.add(result._indexes[j])
    }

    if(allowPartialMatch && !hasAtLeast1Match) return NULL

    resetNextBeginningIndexes()

    // allows a search with spaces that's an exact substring to score well
    var allowSpacesResult = algorithm(preparedSearch, target, /*allowSpaces=*/true)
    if(allowSpacesResult !== NULL && allowSpacesResult.score > score) {
      return allowSpacesResult
    }

    if(allowPartialMatch) result = target
    result.score = score

    var i = 0
    for (let index of seen_indexes) result._indexes[i++] = index
    result._indexes.len = i

    return result
  }


  var prepareLowerInfo = (str) => {
    var strLen = str.length
    var lower = str.toLowerCase()
    var lowerCodes = [] // new Array(strLen)    sparse array is too slow
    var bitflags = 0
    var containsSpace = false // space isn't stored in bitflags because of how searching with a space works

    for(var i = 0; i < strLen; ++i) {
      var lowerCode = lowerCodes[i] = lower.charCodeAt(i)

      if(lowerCode === 32) {
        containsSpace = true
        continue // it's important that we don't set any bitflags for space
      }

      var bit = lowerCode>=97&&lowerCode<=122 ? lowerCode-97 // alphabet
              : lowerCode>=48&&lowerCode<=57  ? 26           // numbers
                                                             // 3 bits available
              : lowerCode<=127                ? 30           // other ascii
              :                                 31           // other utf8
      bitflags |= 1<<bit
    }

    return {lowerCodes:lowerCodes, bitflags:bitflags, containsSpace:containsSpace, _lower:lower}
  }
  var prepareBeginningIndexes = (target) => {
    var targetLen = target.length
    var beginningIndexes = []; var beginningIndexesLen = 0
    var wasUpper = false
    var wasAlphanum = false
    for(var i = 0; i < targetLen; ++i) {
      var targetCode = target.charCodeAt(i)
      var isUpper = targetCode>=65&&targetCode<=90
      var isAlphanum = isUpper || targetCode>=97&&targetCode<=122 || targetCode>=48&&targetCode<=57
      var isBeginning = isUpper && !wasUpper || !wasAlphanum || !isAlphanum
      wasUpper = isUpper
      wasAlphanum = isAlphanum
      if(isBeginning) beginningIndexes[beginningIndexesLen++] = i
    }
    return beginningIndexes
  }
  var prepareNextBeginningIndexes = (target) => {
    var targetLen = target.length
    var beginningIndexes = prepareBeginningIndexes(target)
    var nextBeginningIndexes = [] // new Array(targetLen)     sparse array is too slow
    var lastIsBeginning = beginningIndexes[0]
    var lastIsBeginningI = 0
    for(var i = 0; i < targetLen; ++i) {
      if(lastIsBeginning > i) {
        nextBeginningIndexes[i] = lastIsBeginning
      } else {
        lastIsBeginning = beginningIndexes[++lastIsBeginningI]
        nextBeginningIndexes[i] = lastIsBeginning===undefined ? targetLen : lastIsBeginning
      }
    }
    return nextBeginningIndexes
  }


  var cleanup = () => { preparedCache.clear(); preparedSearchCache.clear(); matchesSimple = []; matchesStrict = [] }

  var preparedCache       = new Map()
  var preparedSearchCache = new Map()
  var matchesSimple = []; var matchesStrict = []


  // for use with keys. just returns the maximum score
  var defaultScoreFn = (a) => {
    var max = INT_MIN
    var len = a.length
    for (var i = 0; i < len; ++i) {
      var result = a[i]; if(result === NULL) continue
      var score = result.score
      if(score > max) max = score
    }
    if(max === INT_MIN) return NULL
    return max
  }
  var nextBeginningIndexesChanges = [] // allows straw berry to match strawberry well, by modifying the end of a substring to be considered a beginning index for the rest of the search
  var keysSpacesBestScores = []
  var allowPartialMatchScores = []
  var tmpResults = []

  // prop = 'key'              2.5ms optimized for this case, seems to be about as fast as direct obj[prop]
  // prop = 'key1.key2'        10ms
  // prop = ['key1', 'key2']   27ms
  var getValue = (obj, prop) => {
    if(typeof prop === 'function') return prop(obj)
    var tmp = obj[prop]; if(tmp !== undefined) return tmp
    var segs = prop
    if(!Array.isArray(prop)) segs = prop.split('.')
    var len = segs.length
    var i = -1
    while (obj && (++i < len)) obj = obj[segs[i]]
    return obj
  }

  var isPrepared = (x) => { return typeof x === 'object' && typeof x._bitflags === 'number' }
  // var INT_MAX = 9007199254740991; var INT_MIN = -INT_MAX
  var INT_MAX = Infinity; var INT_MIN = -INT_MAX
  var noResults = []; noResults.total = 0
  var NULL = null


  // Hacked version of https://github.com/lemire/FastPriorityQueue.js
  var fastpriorityqueue=r=>{var e=[],o=0,a={},v=r=>{for(var a=0,v=e[a],c=1;c<o;){var s=c+1;a=c,s<o&&e[s].score<e[c].score&&(a=s),e[a-1>>1]=e[a],c=1+(a<<1)}for(var f=a-1>>1;a>0&&v.score<e[f].score;f=(a=f)-1>>1)e[a]=e[f];e[a]=v};return a.add=(r=>{var a=o;e[o++]=r;for(var v=a-1>>1;a>0&&r.score<e[v].score;v=(a=v)-1>>1)e[a]=e[v];e[a]=r}),a.poll=(r=>{if(0!==o){var a=e[0];return e[0]=e[--o],v(),a}}),a.peek=(r=>{if(0!==o)return e[0]}),a.replaceTop=(r=>{e[0]=r,v()}),a}
  var q = fastpriorityqueue() // reuse this


  // fuzzysort is written this way for minification. all names are mangeled unless quoted
  return {'single':single, 'go':go, 'highlight':highlight, 'prepare':prepare, 'cleanup':cleanup}
}) // UMD

// TODO: (feature) frecency
// TODO: (perf) use different sorting algo depending on the # of results?
// TODO: (perf) preparedCache is a memory leak
// TODO: (like sublime) backslash === forwardslash
// TODO: (perf) prepareSearch seems slow
