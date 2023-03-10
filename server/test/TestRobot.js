var r = require('../core/Robot.js')

/**
 * run 'npm test' at Terminal
 */
describe('测试双机器人对战', function () {
    var mapp = []
    for (var i = 0; i < 8; ++i) {
        mapp[i] = []
    }
    mapp[3][3] = 1
    mapp[3][4] = -1
    mapp[4][3] = -1
    mapp[4][4] = 1

    var nowcolor = 1
    for (let i = 0; i < 60; ++i) {
        var result = r.robot(mapp, nowcolor, 1)
        console.log(result)
        mapp[result.x][result.y] = nowcolor
        nowcolor = -nowcolor
    }

    console.log(mapp)
})

describe('测试辅助落子', function () {
    var mapp = []
    for (var i = 0; i < 8; ++i) {
        mapp[i] = []
    }
    mapp[3][3] = 1
    mapp[3][4] = -1
    mapp[4][3] = -1
    mapp[4][4] = 1

    console.log(r.getExpect(mapp, 1))
})
