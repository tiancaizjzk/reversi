var Map = require('./../tools/Map.js')
var Table = require('../model/bean/Table.js')
var PlayerManager = require('../manager/PlayerManager.js')
var UnitTools = require('../tools/UnitTools.js')
const { PLAYER_STATE, CLEAR_STATE } = require('../model/enums/constants.js')

class RoomManager {

    constructor () {
        this.tables = new Map()
        this.playerManager = PlayerManager
    }

    /**
     * 创建房间(棋桌)
     * @param openId
     * @param tableId
     * @param custom
     */
    createTable (openId, tableId, custom) {
        var table = new Table(openId, tableId, custom)
        this.tables.setKeyValue(tableId, table)
    }

    /**
     * 加入房间(棋桌)
     * @param openId
     * @param tableId
     * @param pos
     */
    inPos (openId, tableId, pos, state) {
        var self = this
        var table = self.tables.getNotCreate(tableId)
        if (!UnitTools.isNullOrUndefined(table)) {
            table.inPos(openId, pos)
            self.playerManager.setTableId(openId, tableId)
            self.playerManager.setPos(openId, pos)
            self.playerManager.updatePlayerState(openId, state)
        }
    }

    /**
     * 离开房间
     * @param openId
     */
    outRoom (openId) {
        console.log(`RoomManager [outRoom] openId => `, {openId})
        var self = this
        var tableId = self.playerManager.getTableId(openId)
        if (!UnitTools.isNullOrUndefined(tableId)) {
            var table = self.tables.getNotCreate(tableId)
            if (!UnitTools.isNullOrUndefined(table)) {
                table.outRoom(openId)
                self.playerManager.setTableId(openId, null)
                self.playerManager.setPos(openId, null)
                self.playerManager.updatePlayerState(openId, PLAYER_STATE.IN_HALL)
                if (table.isRoomEmpty()) {
                    self.removeTable(tableId)
                } else {
                    table.eachPos(function (pos) {
                        var eachPlayer = self.playerManager.getPlayer(table.getPidWithPos(pos))
                        if (!UnitTools.isNullOrUndefined(eachPlayer)) {
                            self.playerManager.updatePlayerState(eachPlayer.openId, PLAYER_STATE.GAME_PREPARE)
                            table.posReadyCancel(pos)
                        }
                    })
                }
            }
        }
    }

    /**
     * 获得棋桌信息
     * @param tableId
     * @returns {*}
     */
    getTable (tableId) {
        var self = this
        return self.tables.getNotCreate(tableId)
    }

    /**
     * 删除棋桌
     * @param tableId
     */
    removeTable (tableId) {
        var self = this
        var table = self.tables.getNotCreate(tableId)
        if (!UnitTools.isNullOrUndefined(table)) {
            if (!UnitTools.isNullOrUndefined(table.logic)) {
                table.logic.destroy()
            }
            if (!UnitTools.isNullOrUndefined(table.room)) {
                table.room.destroy()
            }
            if (!UnitTools.isNullOrUndefined(table)) {
                table.destroy()
                table = null
            }
        }
        self.tables.remove(tableId)
    }

    /**
     * 清理战场
     */
    clearTables () {
        var self = this
        if (self.matchState === CLEAR_STATE.CLEARING) {
            return
        }
        self.matchState === CLEAR_STATE.CLEARING
        try {
            if (!UnitTools.isNullOrUndefined(self.tables)) {
                self.tables.forEach(function (tableId, table) {
                    if (table.isUnavailable()) {
                        console.log('table ' + tableId + ' is unavailable, remove it')
                        self.removeTable(tableId)
                    }
                })
            }
        } catch (e) {
            console.log('clearTables error =>', e)
        } finally {
            self.matchState = CLEAR_STATE.FREE
        }
    }

}

RoomManager.g_instance = new RoomManager()

module.exports = RoomManager.g_instance
