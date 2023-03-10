const MAPPOINTCOUNT = [
    [90, -60, 10, 10, 10, 10, -60, 90],
    [-60, -80, 5, 5, 5, 5, -80, -60],
    [10, 5, 1, 1, 1, 1, 5, 10],
    [10, 5, 1, 1, 1, 1, 5, 10],
    [10, 5, 1, 1, 1, 1, 5, 10],
    [10, 5, 1, 1, 1, 1, 5, 10],
    [-60, -80, 5, 5, 5, 5, -80, -60],
    [90, -60, 10, 10, 10, 10, -60, 90]
]

const MOVE = [
    [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1],
    [1, 1], [-1, 1]
]

const SIZE = 8

class Point {

    constructor (x, y) {
        this.x = x
        this.y = y
    }

    add (x, y) {
        this.x += x
        this.y += y
    }
}

function copymap (one, last) {
    for (var i = 0; i < SIZE; ++i) {
        for (var j = 0; j < SIZE; ++j) {
            one[i][j] = last[i][j]
        }
    }
}

function Judge (x, y, color, mapp) {
    if (mapp[x][y]) {
        return 0
    }
    var me = (color === 1) ? 1 : -1
    var count = 0
    var flag = 0
    for (var i = 0; i < SIZE; ++i) {
        flag = 0
        var star = new Point(x + MOVE[i][0], y + MOVE[i][1])
        while (star.x >= 0 && star.x < SIZE && star.y >= 0 && star.y < SIZE && mapp[star.x][star.y]) {
            if (mapp[star.x][star.y] === -me) {
                flag++
            } else {
                count += flag
                break
            }
            star.add(MOVE[i][0], MOVE[i][1])
        }
    }
    return count
}

function Change (now, mapp) {
    var me = mapp[now.x][now.y]
    var flag
    for (var i = 0; i < SIZE; ++i) {
        flag = false
        var a = new Point(now.x + MOVE[i][0], now.y + MOVE[i][1])
        while (a.x >= 0 && a.x < SIZE && a.y >= 0 && a.y < SIZE && mapp[a.x][a.y]) {
            if (mapp[a.x][a.y] === -me) {
                flag = true
            } else {
                if (flag) {
                    a.add(-MOVE[i][0], -MOVE[i][1])
                    var b = new Point(now.x + MOVE[i][0], now.y + MOVE[i][1])
                    while (((now.x <= b.x && b.x <= a.x) || (a.x <= b.x && b.x <= now.x)) &&
                        ((now.y <= b.y && b.y <= a.y) || (a.y <= b.y && b.y <= now.y))) {
                        b.add(MOVE[i][0], MOVE[i][1])
                    }
                }
                break
            }
            a.add(MOVE[i][0], MOVE[i][1])
        }
    }
}

function Statistic (mapp, expect, nowcolor) {
    var nowexpect = 0
    for (var i = 0; i < SIZE; ++i) {
        for (var j = 0; j < SIZE; ++j) {
            expect[i][j] = Judge(i, j, nowcolor, mapp)
            if (expect[i][j]) {
                ++nowexpect
            }
        }
    }
    return nowexpect
}

function Easy (expect) {
    var MAX = new Point(null, null)
    var maxx = 0
    for (var i = 0; i < SIZE; ++i) {
        for (var j = 0; j < SIZE; ++j) {
            if (expect[i][j] >= maxx) {
                maxx = expect[i][j]
                MAX.x = i
                MAX.y = j
            }
        }
    }
    return MAX
}

function Middle (mapp, expect, nowcolor) {
    var me = 0
    var expectnow = []
    for (let i = 0; i < SIZE; ++i) {
        expectnow[i] = []
    }
    var mappnow = []
    for (let i = 0; i < SIZE; ++i) {
        mappnow[i] = []
    }

    function WeightMap (x, y, w) {
        this.x = x
        this.y = y
        this.w = w
    }

    var WEA = []

    for (let i = 0; i < SIZE; ++i) {
        for (let j = 0; j < SIZE; ++j) {
            if (expect[i][j]) {
                me = MAPPOINTCOUNT[i][j] + expect[i][j]
                copymap(mappnow, mapp)
                mappnow[i][j] = nowcolor
                var nowpoint = new Point(i, j)
                if ((i === 0 && j === 0) || (i === 0 && j === SIZE - 1) || (i === SIZE - 1 && j === 0) ||
                    (i === SIZE - 1) && (j === SIZE - 1)) {
                    return nowpoint
                }
                Change(nowpoint, mappnow)
                var you = -1050
                for (var k = 0; k < SIZE; ++k) {
                    for (var l = 0; l < SIZE; ++l) {
                        expectnow[k][l] = Judge(k, l, -nowcolor, mappnow)
                        if (expectnow[k][l]) {
                            you = you < MAPPOINTCOUNT[k][l] + expectnow[k][l] ? MAPPOINTCOUNT[k][l] + expectnow[k][l] : you
                        }
                    }
                }
                WEA.push(new WeightMap(i, j, me - you))
            }
        }
    }
    WEA.sort(function (x, y) { return y.w - x.w })
    for (let i in WEA) {
        if ((WEA[i].x < 2 && WEA[i].y < 2) || (WEA[i].x < 2 && SIZE - WEA[i].y - 1 < 2) ||
            (SIZE - WEA[i].x - 1 < 2 && WEA[i].y < 2) || (SIZE - 1 - WEA[i].x < 2 && SIZE - 1 - WEA[i].y < 2)) {
            continue
        }
        return new Point(WEA[i].x, WEA[i].y)
    }
    if (WEA.length > 0) {
        return new Point(WEA[0].x, WEA[0].y)
    } else {
        return new Point(null, null)
    }
}

function difai (x, y, nowcolor, mappnow, expectnow, depth, depinmax) {
    if (depth >= depinmax) {
        return 0
    }

    var maxx = -10005
    var expectnow2 = []
    for (let i = 0; i < SIZE; ++i) {
        expectnow2[i] = []
    }
    var mappnow2 = []
    for (let i = 0; i < SIZE; ++i) {
        mappnow2[i] = []
    }
    var mapnext = []
    for (let i = 0; i < SIZE; ++i) {
        mapnext[i] = []
    }
    var expectlast = []
    for (let i = 0; i < SIZE; ++i) {
        expectlast[i] = []
    }

    copymap(mappnow2, mappnow)
    var me = MAPPOINTCOUNT[x][y] + expectnow[x][y]
    var now = new Point(x, y)

    Change(now, mappnow2)
    var lineexpect = 0
    var maxexpect = 0
    for (let i = 0; i < SIZE; ++i) {
        for (let j = 0; j < SIZE; ++j) {
            expectnow2[i][j] = Judge(i, j, -nowcolor, mappnow2)
            if (expectnow2[i][j]) {
                ++maxexpect
                if ((i === 0 && j === 0) || (i === 0 && j === SIZE - 1) || (i === SIZE - 1 && j === SIZE - 1) ||
                    (i === SIZE - 1 && j === 0)) {
                    return -1000
                }
                if ((i < 2 && j < 2) || (i < 2 && SIZE - j - 1 < 2) || (SIZE - 1 - i < 2 && j < 2) ||
                    (SIZE - 1 - i < 2 && SIZE - 1 - j < 2)) {
                    ++lineexpect
                }
            }
        }
    }
    if (lineexpect * 10 > maxexpect * 7) {
        return 1400
    }
    for (let i = 0; i < SIZE; ++i) {
        for (let j = 0; j < SIZE; ++j) {
            if (expectnow2[i][j]) {
                var you = MAPPOINTCOUNT[i][j] + expectnow2[i][j]
                copymap(mapnext, mappnow2)
                mapnext[i][j] = -nowcolor
                now.x = i
                now.y = j
                Change(now, mapnext)
                for (let k = 0; k < SIZE; ++k) {
                    for (let l = 0; l < SIZE; ++l) {
                        expectlast[k][l] = Judge(k, l, nowcolor, mapnext)
                    }
                }
                for (let k = 0; k < SIZE; ++k) {
                    for (let l = 0; l < SIZE; ++l) {
                        if (expectlast[k][l]) {
                            var nowm = me - you + difai(k, l, nowcolor, mapnext, expectlast, depth + 1, depinmax)
                            maxx = maxx < nowm ? nowm : maxx
                        }
                    }
                }
            }
        }
    }
    return maxx
}

function Difficult (mapp, expect, nowcolor) {
    var max = new Point(null, null)
    var maxx = -10005
    for (let i = 0; i < SIZE; ++i) {
        for (let j = 0; j < SIZE; ++j) {
            if (expect[i][j]) {
                if ((i === 0 && j === 0) || (i === 0 && j === SIZE - 1) || (i === SIZE - 1 && j === SIZE - 1) ||
                    (i === SIZE - 1 && j === 0)) {
                    max.x = i
                    max.y = j
                    return max
                }
                var k = difai(i, j, nowcolor, mapp, expect, 0, 3)
                if (k >= maxx) {
                    maxx = k
                    max.x = i
                    max.y = j
                }
            }
        }
    }
    return max
}

/**
    * AI
    * @param mapp: 地图，8*8 Array, 1，-1两个颜色
      @param nowcolor: 1, -1 表示两种颜色
      @param difficult: 1: 简单, 2:中等，3:高等
    * @return result = Point(), result.x, result.y表示两个坐标
*/
function robot (mapp, nowcolor, diffcult) {
    var expect = []
    for (var i = 0; i < SIZE; ++i) {
        expect[i] = []
    }
    Statistic(mapp, expect, nowcolor)
    switch (diffcult) {
        case 1:
            return Easy(expect)
        case 2:
            return Middle(mapp, expect, nowcolor)
        case 3:
            return Difficult(mapp, expect, nowcolor)
        default:
            break
    }
}

/**
    * 辅助落子
    * @param mapp: 地图，8*8 Array, 1，-1两个颜色
      @param nowcolor: 1, -1 表示两种颜色
    * @return result = Array[Point()], 坐标list
*/
function getExpect (mapp, nowcolor) {
    var expect = []
    for (let i = 0; i < SIZE; ++i) {
        expect[i] = []
    }
    var result = []
    for (let i = 0; i < SIZE; ++i) {
        for (var j = 0; j < SIZE; ++j) {
            expect[i][j] = Judge(i, j, nowcolor, mapp)
            if (expect[i][j]) {
                result.push(new Point(i, j))
            }
        }
    }
    return result
}

module.exports = {
    robot,
    getExpect
}
