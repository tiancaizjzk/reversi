var TunnelManager = require('./TunnelManager.js')
var Reversi = require('../service/Reversi.js')
var PlayerManager = require('./PlayerManager.js')
var RoomManager = require('./RoomManager.js')
var Codes = require('../model/enums/codes')
var UnitTools = require('../tools/UnitTools.js')
const { ON_MESSAGE, OUT_MESSAGE, PLAYER_STATE } = require('../model/enums/constants.js')

class FriendManager {

    constructor () {
        this.playerManager = PlayerManager
        this.tunnelManager = TunnelManager
        this.roomManager = RoomManager
        // 启动棋局监听
        this.reversi = Reversi.instance()
        var self = this
        self.tunnelManager.onType(ON_MESSAGE.Friend, function (tunnelId, content) {
            console.log(`FriendManager [Friend] =>`, {tunnelId, content})
            self.createTable(tunnelId)
        })
        self.tunnelManager.onType(ON_MESSAGE.JoinGame, function (tunnelId, content) {
            console.log(`FriendManager [JoinGame] =>`, {tunnelId, content})
            if (!content.roomId) {
                return
            }
            self.joinTable(tunnelId, content.roomId)
        })
        self.tunnelManager.onType(ON_MESSAGE.QuitRoom, function (tunnelId, content) {
            console.log(`FriendManager [QuitRoom] =>`, {tunnelId, content})
            self.quitRoom(tunnelId)
        })
        self.tunnelManager.onType(ON_MESSAGE.StartRoomGame, function (tunnelId, content) {
            console.log(`FriendManager [StartRoomGame] =>`, {tunnelId, content})
            self.startGame(tunnelId)
        })
    }

    static instance () {
        if (FriendManager.g_instance == null) {
            FriendManager.g_instance = new FriendManager()
        }
        return FriendManager.g_instance
    }

    /**
     * 开始游戏
     * @param tunnelId
     */
    startGame (tunnelId) {
        console.log('FriendManager [startGame] => ', { tunnelId })
        var self = this
        var player = self.tunnelManager.getPlayerByTunnelId(tunnelId)
        if (UnitTools.isNullOrUndefined(player)) {
            // 该玩家已经断开了连接
            console.error('FriendManager [startGame] player is offline', { tunnelId })
            return
        }
        self.playerManager.updatePlayerTunnelId(player.openId, tunnelId)
        if (!UnitTools.isNullOrUndefined(player.state) && player.state === PLAYER_STATE.GAME_PREPARE) {
            var roomId = self.playerManager.getTableId(player.openId)
            if (UnitTools.isNullOrUndefined(roomId)) {
                self.tunnelManager.emit(OUT_MESSAGE.StartRoomGameError, { 'code': Codes.ROOM_NOT_EXIST }, tunnelId)
                return
            }
            var table = self.roomManager.getTable(roomId)
            if (UnitTools.isNullOrUndefined(table)) {
                self.tunnelManager.emit(OUT_MESSAGE.StartRoomGameError, { 'code': Codes.ROOM_NOT_EXIST }, tunnelId)
                return
            }
            if (table.posReady(self.playerManager.getPos(player.openId))) {
                self.tunnelManager.emit(OUT_MESSAGE.StartRoomGameSuccess, {}, tunnelId)
                if (table.isAllPosReady()) {
                    table.eachPos(function (pos) {
                        table.getLogic().startGame(pos)
                    })
                }
            } else {
                self.tunnelManager.emit(OUT_MESSAGE.StartRoomGameError, { 'code': Codes.SYSTEM_ERROR }, tunnelId)
            }
        } else {
            // 该玩家目前并不在房间里面
            console.error('FriendManager [startGame] player is not in the room', { tunnelId })
            self.tunnelManager.emit(OUT_MESSAGE.StartRoomGameError, { 'code': Codes.PLAYER_NOT_IN_ROOM }, tunnelId)
        }
    }

    /**
     * 创建房间
     * @param tunnelId
     */
    createTable (tunnelId) {
        console.log('FriendManager [createTable] => ', { tunnelId })
        var self = this
        var player = self.tunnelManager.getPlayerByTunnelId(tunnelId)
        if (UnitTools.isNullOrUndefined(player)) {
            // 该玩家已经断开了连接
            console.error('FriendManager [createTable] player is offline', { tunnelId })
            return
        }
        self.playerManager.updatePlayerTunnelId(player.openId, tunnelId)
        if (!UnitTools.isNullOrUndefined(player.state) && player.state === PLAYER_STATE.IN_HALL) {
            var roomId = UnitTools.genID()
            if (!self.reversi.createTable(player.openId, roomId, null, PLAYER_STATE.GAME_PREPARE)) {
                self.tunnelManager.emit(OUT_MESSAGE.RoomError, { 'code': Codes.CREATE_ROOM_ERROR }, player.tunnelId)
            }
            console.log(`FriendManager [createTable] success => `, {player})
            self.tunnelManager.emit(OUT_MESSAGE.RoomCreated, {'roomId': roomId, 'stand': self.playerManager.getPos(player.openId)}, player.tunnelId)
        } else {
            // 该玩家目前并不在大厅里面
            console.error('FriendManager [createTable] player is not in the hall', { tunnelId })
            self.tunnelManager.emit(OUT_MESSAGE.RoomError, { 'code': Codes.PLAYER_NOT_IN_HALL }, tunnelId)
        }
    }

    /**
     * 加入房间
     * @param tunnelId
     */
    joinTable (tunnelId, roomId) {
        console.log('FriendManager [joinTable] => ', { tunnelId, roomId })
        var self = this
        var player = self.tunnelManager.getPlayerByTunnelId(tunnelId)
        if (UnitTools.isNullOrUndefined(player)) {
            // 该玩家已经断开了连接
            console.error('FriendManager [joinTable] player is offline', { tunnelId, roomId })
            return
        }
        self.playerManager.updatePlayerTunnelId(player.openId, tunnelId)
        if (!UnitTools.isNullOrUndefined(player.state) && player.state === PLAYER_STATE.IN_HALL) {
            if (!self.reversi.joinTable(player.openId, roomId, PLAYER_STATE.GAME_PREPARE)) {
                self.tunnelManager.emit(OUT_MESSAGE.JoinRoomError, { 'code': Codes.JOIN_ROOM_ERROR }, player.tunnelId)
            } else {
                console.log(`FriendManager [joinTable] success => `, {player})
                self.tunnelManager.emit(OUT_MESSAGE.JoinRoomSuccess, {'roomId': roomId, 'stand': self.playerManager.getPos(player.openId)}, player.tunnelId)
                var table = self.roomManager.getTable(roomId)
                if (!UnitTools.isNullOrUndefined(table)) {
                    table.eachPos(function (pos) {
                        var eachPlayer = self.playerManager.getPlayer(table.getPidWithPos(pos))
                        if (UnitTools.isNullOrUndefined(eachPlayer) || UnitTools.isNullOrUndefined(eachPlayer.tunnelId) || tunnelId !== eachPlayer.tunnelId) {
                            self.tunnelManager.emit(OUT_MESSAGE.SomeoneJoinRoom, {'player': eachPlayer}, eachPlayer.tunnelId)
                        }
                    })
                }
            }
        } else {
            // 该玩家目前并不在大厅里面
            console.error('FriendManager [joinTable] player is not in the hall', { tunnelId, roomId })
            self.tunnelManager.emit(OUT_MESSAGE.JoinRoomError, { 'code': Codes.PLAYER_NOT_IN_HALL }, tunnelId)
        }
    }

    /**
     * 离开房间
     * 如果双方都离开了房间,则该房间销毁
     * @param tunnelId
     */
    quitRoom (tunnelId) {
        console.log('FriendManager [quitRoom] => ', { tunnelId })
        var self = this
        var player = self.tunnelManager.getPlayerByTunnelId(tunnelId)
        if (UnitTools.isNullOrUndefined(player)) {
            // 该玩家已经断开了连接
            console.error('FriendManager [quitRoom] player is offline', { tunnelId })
            return
        }
        self.playerManager.updatePlayerTunnelId(player.openId, tunnelId)
        if (!UnitTools.isNullOrUndefined(player.state) && player.state === PLAYER_STATE.GAME_PREPARE) {
            var roomId = self.playerManager.getTableId(player.openId)
            self.roomManager.outRoom(player.openId)
            console.log(`FriendManager [quitRoom] success => `, {player})
            self.tunnelManager.emit(OUT_MESSAGE.QuitRoomSuccess, {}, player.tunnelId)
            var table = self.roomManager.getTable(roomId)
            console.log('FriendManager [quitRoom] table', { roomId, table })
            if (!UnitTools.isNullOrUndefined(table)) {
                table.eachPos(function (pos) {
                    var eachPlayer = self.playerManager.getPlayer(table.getPidWithPos(pos))
                    console.log(`FriendManager [quitRoom] eachPlayer => `, {pos, eachPlayer})
                    if (UnitTools.isNullOrUndefined(eachPlayer) || UnitTools.isNullOrUndefined(eachPlayer.tunnelId) || tunnelId !== eachPlayer.tunnelId) {
                        self.tunnelManager.emit(OUT_MESSAGE.SomeoneQuitRoom, {'player': eachPlayer}, eachPlayer.tunnelId)
                    }
                })
            }
        } else {
            // 该玩家目前并不在房间里面
            console.error('FriendManager [quitRoom] player is not in the room', { tunnelId })
            self.tunnelManager.emit(OUT_MESSAGE.QuitRoomError, { 'code': Codes.PLAYER_NOT_IN_ROOM }, tunnelId)
        }
    }

}

FriendManager.g_instance = null

module.exports = FriendManager
