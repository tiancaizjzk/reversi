var Logic = require('../../core/Logic.js')
var Room = require('./Room.js')
var PlayerManager = require('../../manager/PlayerManager.js')
var UnitTools = require('../../tools/UnitTools.js')
const { GAME_STATE } = require('../enums/constants.js')

class Table {

    constructor (openId, tableId, custom) {
        this.posCount = 2
        this.createId = openId
        this.createdTime = new Date()
        this.tableId = tableId
        this.custom = custom
        this.room = new Room(openId, this.posCount, custom)
        this.logic = new Logic(this, 8)
        this.playerManager = PlayerManager
    }

    /**
     * 销毁
     */
    destroy () {
        this.posCount = null
        this.createId = null
        this.createdTime = null
        this.tableId = null
        this.custom = null
        this.room = null
        this.logic = null
    }

    /**
     * 获得逻辑数据
     * @returns {Logic}
     */
    getLogic () {
        return this.logic
    }

    /**
     * 房间是否超时 存在30分钟
     * @returns {boolean}
     */
    isTimeout () {
        return this.createdTime.getTime() - new Date().getTime() > 30 * 60 * 1000
    }

    /**
     * 获得某个位置的账号
     * @param pos
     * @returns {*}
     */
    getPidWithPos (pos) {
        var posInfo = this.room.getInPosInfo()[pos]
        if (UnitTools.isNullOrUndefined(posInfo)) {
            return null
        }
        return posInfo.account
    }

    /**
     * 进入座位
     * @param openId
     * @param pos
     * @returns {boolean}
     */
    inPos (openId, pos) {
        var ok = this.room.inPos(openId, pos)
        return ok
    }

    /**
     * 离开座位
     * @param openId
     * @returns {boolean}
     */
    outRoom (openId) {
        var ok = this.room.outRoom(openId)
        if (ok) {
            this.playerManager.setTableId(openId, null)
            this.playerManager.setPos(openId, null)
        }
        return ok
    }

    /**
     * 遍历每一个位置
     * @param cb
     */
    eachPos (cb) {
        for (var pos = 0; pos < this.posCount; pos++) {
            cb(pos)
        }
    }

    /**
     * 房间是否为空
     * @param tableId
     * @returns {boolean}
     */
    isRoomEmpty () {
        return this.room.isRoomEmpty()
    }

    /**
     * 准备
     * @param pos
     * @returns {boolean}
     */
    posReady (pos) {
        return this.room.posReady(pos, true)
    }

    /**
     * 取消准备
     * @param pos
     * @returns {boolean}
     */
    posReadyCancel (pos) {
        return this.room.posReady(pos, false)
    }

    /**
     * 是否都已准备
     * @returns {boolean}
     */
    isAllPosReady () {
        return this.room.isAllPosReady()
    }

    /**
     * 该房间是否不可用
     * @returns {boolean}
     */
    isUnavailable () {
        return this.getLogic().gameState === GAME_STATE.TIMEOUT_END || this.getLogic().gameState === GAME_STATE.END || this.isRoomEmpty() || this.isTimeout()
    }

}

module.exports = Table
