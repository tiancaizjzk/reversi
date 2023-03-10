var Map = require('../../tools/Map.js')
var UnitTools = require('../../tools/UnitTools.js')

var Room = function (id, posCount, custom) {
    this.roomId = id
    this.posCount = posCount
    this.accounts = new Map() // 房间里的账号，为了以后的观战模式做准备
    this.posInfo = new Map() // 座位信息
    this.custom = custom // 个性化信息，暂留
    this.isStarted = false // 是否已经开始了
    this.createTime = new Date() // 创建的时间
}

/**
 * 销毁
 */
Room.prototype.destroy = function () {
    this.roomId = null
    this.posCount = null
    this.accounts = null
    this.posInfo = null
    this.custom = null
    this.isStarted = null
    this.createTime = null
}

/**
 * 判断座位号是否合法
 * @param pos
 * @returns {boolean}
 */
Room.prototype.isPosValid = function (pos) {
    try {
        var posNum = Number(pos)
        if (posNum < this.posCount && posNum >= 0) {
            return true
        }
    } catch (e) {
        return false
    }
}

/**
 * 根据账号寻找座位号
 * @param account
 * @returns {*}
 */
Room.prototype.getPos = function (account) {
    if (UnitTools.isNullOrUndefined(account)) {
        return null
    }
    var findPos = null
    this.posInfo.forEach(function (pos, info) {
        if (!UnitTools.isNullOrUndefined(info.account) && info.account.toString() === account.toString()) {
            findPos = pos
        }
    })
    return findPos
}

/**
 * 位置是否为空
 * @param pos
 * @returns {boolean}
 */
Room.prototype.isPosEmpty = function (pos) {
    if (!this.isPosValid(pos)) {
        return false
    }
    var posInfo = this.posInfo.getNotCreate(pos)
    if (UnitTools.isNullOrUndefined(posInfo)) return true
    if (UnitTools.isNullOrUndefined(posInfo.account)) return true
    return false
}

/**
 * 房间是否为空
 * @returns {boolean}
 */
Room.prototype.isRoomEmpty = function () {
    var allAccounts = this.getInRoomAllAccounts()
    for (var key in allAccounts) {
        var account = allAccounts[key]
        var pos = this.getPos(account)
        if (!this.isPosEmpty(pos)) return false
    }
    return true
}

/**
 * 玩家进入房间
 * @param account
 * @returns {boolean}
 */
Room.prototype.inRoom = function (account) { // 进入房间
    this.accounts.setKeyValue(account, {})
    return true
}

/**
 * 玩家进入座位
 * @param account
 * @param pos
 * @returns {boolean}
 */
Room.prototype.inPos = function (account, pos) {
    // 判断玩家是不是在座位上，如果在，则移除之前的位置，进入新位置
    if (!this.isPosValid(pos)) return false
    this.inRoom(account)// 如果直接调用inPos，那么需要把账号进入房间
    if (!this.isPosEmpty(pos)) return false
    var self = this
    this.posInfo.forEach(function (key, value) {
        try {
            if (value.account.toString() === account.toString()) {
                self.posInfo.setKeyValue(key, {})
            }
        } catch (e) {
        }
    })
    var posInfo = this.posInfo.getOrCreate(pos)
    posInfo.account = account
    posInfo.isReady = false
    return true
}

/**
 * 玩家离开房间
 * @param account
 */
Room.prototype.outRoom = function (account) { // 离开房间
    this.accounts.remove(account)
    return this.outPos(account)
}

/**
 * 玩家离开座位
 * @param account
 * @returns {boolean}
 */
Room.prototype.outPos = function (account) {
    if (UnitTools.isNullOrUndefined(account)) return false
    var self = this
    this.posInfo.forEach(function (key, value) {
        try {
            if (value.account.toString() === account.toString()) {
                self.posInfo.remove(key)
            }
        } catch (e) {
        }
    })
    return true
}

/**
 * 获取一个空闲的座位 如果没有的话返回null
 * @returns {*}
 */
Room.prototype.getFreePos = function () {
    var freePos = null
    for (var startPos = 0; startPos < this.posCount; startPos++) {
        var posInfo = this.posInfo.getNotCreate(startPos)
        if (UnitTools.isNullOrUndefined(posInfo) || UnitTools.isNullOrUndefined(posInfo.account)) {
            return startPos
        }
    }
    return freePos
}

/**
 * 准备
 * @param pos
 * @param isReady
 * @returns {boolean}
 */
Room.prototype.posReady = function (pos, isReady) {
    if (!this.isPosValid(pos)) return false
    var posInfo = this.posInfo.getNotCreate(pos)
    if (UnitTools.isNullOrUndefined(posInfo)) return false
    posInfo.isReady = isReady
    return true
}

/**
 * 所有的位置是不是准备好了
 * @returns {boolean}
 */
Room.prototype.isAllPosReady = function () {
    var readyCounts = 0
    this.posInfo.forEach(function (pos, info) {
        if (info.isReady === true)readyCounts += 1
    })
    if (readyCounts === this.posCount) return true
    return false
}

/**
 * 某个位置是否准备好了
 * @param pos
 * @returns {boolean}
 */
Room.prototype.isPosReady = function (pos) {
    var info = this.posInfo.getNotCreate(pos)
    if (info.isReady === true) return true
    return false
}

/**
 * 获取准备信息
 * @returns {{}}
 */
Room.prototype.getReadyInfo = function () {
    var readyInfo = {}
    this.posInfo.forEach(function (pos, info) {
        if (info.isReady === true) {
            readyInfo[pos] = true
        }
    })
    return readyInfo
}

/**
 * 获取在座玩家信息
 * @returns {{}}
 */
Room.prototype.getInPosInfo = function () {
    var posInfo = {}
    this.posInfo.forEach(function (pos, info) {
        if (UnitTools.isNullOrUndefined(info.account)) return
        var one = posInfo[pos] = {}
        one.ready = this.isPosReady(pos)
        one.account = info.account
    }.bind(this))
    return posInfo
}

/**
 * 获取在座玩家账号
 * @returns {{}}
 */
Room.prototype.getRoomInPosAccounts = function () {
    var accounts = []
    this.posInfo.forEach(function (key, value) {
        if (UnitTools.isNullOrUndefined(value.account)) return
        accounts.push(value.account)
    })
    return accounts
}

/**
 * 获得没有在座位上的玩家
 * @returns {Array.<*>}
 */
Room.prototype.getNotInPosAccounts = function () {
    var inPosAccounts = [].concat(this.getRoomInPosAccounts())
    var allAccounts = [].concat(this.getInRoomAllAccounts())
    UnitTools.removeArray(allAccounts, inPosAccounts)
    return allAccounts
}

/**
 * 获取所有玩家账号
 * @returns {string[]}
 */
Room.prototype.getInRoomAllAccounts = function () {
    return this.accounts.getKeys()
}

/**
 * 日志
 * @returns {{}}
 */
Room.prototype.logRoomInfo = function () {
    var roomInfo = {}
    roomInfo.roomId = this.roomId
    roomInfo.accounts = []
    this.accounts.forEach(function (key, value) {
        roomInfo.accounts.push(key)
    })
    roomInfo.posInfo = {}
    this.posInfo.forEach(function (key, value) {
        roomInfo.posInfo[key] = value
    })
    roomInfo.posReadyInfo = this.posReadyInfo
    console.log(roomInfo)
    return roomInfo
}

module.exports = Room
