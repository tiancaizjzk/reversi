var TunnelManager = require('../manager/TunnelManager.js')
var RoomManager = require('../manager/RoomManager.js')
var PlayerManager = require('../manager/PlayerManager.js')
var UnitTools = require('../tools/UnitTools.js')
var Chess = require('../model/bean/Chess.js')
const { ON_MESSAGE, POS_TYPE, CHESS_TYPE, PLAYER_STATE } = require('../model/enums/constants.js')

class Reversi {

    constructor () {
        this.roomManager = RoomManager
        this.tunnelManager = TunnelManager
        this.playerManager = PlayerManager
        var self = this
        this.tunnelManager.onType(ON_MESSAGE.FallChess, function (tunnelId, content) {
            console.log(`Reversi [FallChess] =>`, {tunnelId, content})
            if (UnitTools.isNullOrUndefined(content) || UnitTools.isNullOrUndefined(content.chess)) {
                return
            }
            var player = self.tunnelManager.getPlayerByTunnelId(tunnelId)
            if (!UnitTools.isNullOrUndefined(player)) {
                var tableId = self.playerManager.getTableId(player.openId)
                if (!UnitTools.isNullOrUndefined(tableId)) {
                    var table = self.roomManager.tables.getNotCreate(tableId)
                    if (!UnitTools.isNullOrUndefined(table)) {
                        table.getLogic().fallChess(self.covertServerChess(content.chess), false)
                    }
                }
            }
        })
        this.tunnelManager.onType(ON_MESSAGE.StartGame, function (tunnelId, content) {
            console.log(`Reversi [StartGame] =>`, {tunnelId, content})
            var player = self.tunnelManager.getPlayerByTunnelId(tunnelId)
            if (!UnitTools.isNullOrUndefined(player)) {
                console.log(`Reversi [StartGame] find player =>`, {player})
                var tableId = self.playerManager.getTableId(player.openId)
                if (!UnitTools.isNullOrUndefined(tableId)) {
                    console.log(`Reversi [StartGame] find tableId =>`, {tableId})
                    var table = self.roomManager.tables.getNotCreate(tableId)
                    if (!UnitTools.isNullOrUndefined(table)) {
                        console.log(`Reversi [StartGame] find table =>`, {table})
                        table.getLogic().startGame(player.pos)
                    }
                }
            }
        })
    }

    static instance () {
        if (Reversi.g_instance == null) {
            Reversi.g_instance = new Reversi()
        }
        return Reversi.g_instance
    }

    /**
     * 服务器客户端旗子转换
     * @param clientChess
     * @returns {Chess}
     */
    covertServerChess (clientChess) {
        console.log(`Reversi [covertServerChess] =>`, {clientChess})
        var type = clientChess.type === 47 ? CHESS_TYPE.BLACK : CHESS_TYPE.WHITE
        return new Chess(type, clientChess.coor.x, clientChess.coor.y)
    }

    /**
     * 创建房间(棋桌)
     * @param tunnelId 信道ID
     * @param tableId 房间ID
     * @param custom 个性信息
     */
    createTable (openId, tableId, custom, state) {
        var self = this
        var oldTableId = self.playerManager.getTableId(openId)
        if (oldTableId) {
            return false
        }
        self.roomManager.createTable(openId, tableId, custom)
        // 创建棋局执黑
        self.roomManager.inPos(openId, tableId, POS_TYPE.BLACK, state)
        return true
    }

    /**
     * 加入房间(棋桌)
     * @param tunnelId 信道ID
     * @param tableId 房间ID
     * @param pos 个性信息
     */
    joinTable (openId, tableId, state) {
        var self = this
        var player = self.playerManager.getPlayer(openId)
        if (player != null && UnitTools.isNullOrUndefined(player.tableId)) {
            // 不在桌子里,可以加入
            if (self.roomManager.tables.hasKey(tableId)) {
                var table = self.roomManager.tables.getNotCreate(tableId)
                var freePos = table.room.getFreePos()
                if (freePos == null) {
                    // 座位满了
                    return false
                } else {
                    // 可以入座
                    self.roomManager.inPos(openId, tableId, freePos, state)
                    return true
                }
            }
        } else {
            // 在桌子里，返回正确
            return true
        }
    }

    /**
     * 获得用户当前棋局信息
     * @param openId 微信OPENID
     */
    getCurrentGame (openId) {
        var self = this
        var table = self.tables.getNotCreate(openId)
        if (table == null || table.logic == null) {
            return null
        }
        return self.tables.getNotCreate(openId).logic.getChessInfo()
    }

}

Reversi.g_instance = null

module.exports = Reversi
