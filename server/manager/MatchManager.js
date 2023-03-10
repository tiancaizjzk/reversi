var Map = require('../tools/Map.js')
var TunnelManager = require('./TunnelManager.js')
var Reversi = require('../service/Reversi.js')
var PlayerManager = require('./PlayerManager.js')
var Codes = require('../model/enums/codes')
var UnitTools = require('../tools/UnitTools.js')
const { ON_MESSAGE, OUT_MESSAGE, PLAYER_STATE, MATCH_STATE } = require('../model/enums/constants.js')

class MatchManager {

    constructor () {
        this.maxScoreDiff = 200
        this.perScoreDiff = 10
        this.defaultScoreDiff = 20
        this.maxTimeWait = 30 * 1000
        this.defaultScore = 1500
        this.maxPlayer = 1000
        this.playerInfos = new Map() // key = openId, value = player
        this.playerManager = PlayerManager
        this.tunnelManager = TunnelManager
        this.matchState = MATCH_STATE.FREE
        var self = this
        self.tunnelManager.onType(ON_MESSAGE.Match, function (tunnelId, content) {
            console.log(`MatchManager [Match] =>`, {tunnelId, content})
            self.addPlayer(tunnelId)
        })
        self.tunnelManager.event.on(ON_MESSAGE.CancelMatch, function (tunnelId, content) {
            console.log(`MatchManager [CancelMatch] =>`, {tunnelId, content})
            self.deletePlayer(tunnelId)
        })
        // 启动棋局监听
        this.reversi = Reversi.instance()
    }

    static instance () {
        if (MatchManager.g_instance == null) {
            MatchManager.g_instance = new MatchManager()
        }
        return MatchManager.g_instance
    }

    /**
     * 添加匹配玩家
     * @param openId
     */
    addPlayer (tunnelId) {
        console.log('[addPlayer] => ', { tunnelId })
        var self = this
        if (self.playerInfos.count() >= self.maxPlayer) {
            console.log(`[addPlayer] too much player in this queue`)
            return
        }
        var player = self.tunnelManager.getPlayerByTunnelId(tunnelId)
        if (UnitTools.isNullOrUndefined(player)) {
            // 该玩家已经断开了连接
            console.error('[addPlayer] player is offline', { tunnelId })
            return
        }
        var openId = player.openId
        self.playerManager.updatePlayerTunnelId(player.openId, tunnelId)
        var existsPlayer = self.playerInfos.getNotCreate(player.openId)
        if (!UnitTools.isNullOrUndefined(existsPlayer)) {
            // 该玩家已存在于匹配池
            console.log('[addPlayer] player is in the match pool', { tunnelId, openId })
            if (!UnitTools.isNullOrUndefined(existsPlayer.state) && existsPlayer.state === PLAYER_STATE.IN_HALL) {
                // 该玩家状态是正在大厅
                console.log('[addPlayer] player is in the hall, success to start match', { tunnelId, openId })
                self.playerInfos.setKeyValue(openId, player)
                self.tunnelManager.emit(OUT_MESSAGE.MatchStart, { 'code': Codes.SUCCESS }, tunnelId)
            } else {
                // 该玩家目前不在大厅之中
                console.error('[addPlayer] player is not in the hall', { tunnelId, openId })
                self.playerInfos.remove(openId)
            }
        } else {
            // 该玩家不存在于匹配池
            console.log('[addPlayer] player is not in the match pool', { tunnelId, openId })
            if (!UnitTools.isNullOrUndefined(player.state) && player.state === PLAYER_STATE.IN_HALL) {
                player.state = PLAYER_STATE.MATCHING
                player.matchTime = new Date()
                console.log('player score:' + player.score)
                if (UnitTools.isNullOrUndefined(player.score)) {
                    player.score = self.defaultScore
                }
                player.scoreDiff = self.defaultScoreDiff
                console.log('update player before match, playerInfo:' + JSON.stringify(self.playerManager.getPlayer(player.openId)))
                self.playerInfos.setKeyValue(openId, player)
                console.log('[addPlayer] player is in the hall, success to start match', { tunnelId, openId })
                self.tunnelManager.emit(OUT_MESSAGE.MatchStart, { 'code': Codes.SUCCESS }, tunnelId)
            } else {
                // 该玩家目前并不在大厅里面
                console.error('[addPlayer] player is not in the hall', { tunnelId, openId })
                self.tunnelManager.emit(OUT_MESSAGE.MatchError, { 'code': Codes.PLAYER_NOT_IN_HALL }, tunnelId)
            }
        }
    }

    /**
     * 取消匹配
     * @param openId
     * @param tunnelId
     */
    deletePlayer (tunnelId) {
        console.log('[deletePlayer] => tunnelId:d%', tunnelId)
        try {
            var self = this
            var player = self.tunnelManager.getPlayerByTunnelId(tunnelId)
            if (UnitTools.isNullOrUndefined(player)) {
                // 该玩家已经断开了连接
                console.error('[addPlayer] player is offline', { tunnelId })
                return
            }
            var openId = player.openId
            var existsPlayer = self.playerInfos.getNotCreate(openId)
            if (!UnitTools.isNullOrUndefined(existsPlayer)) {
                // 该玩家已存在于匹配池
                if (!UnitTools.isNullOrUndefined(existsPlayer.state) && existsPlayer.state === PLAYER_STATE.MATCHING) {
                    // 该玩家正在匹配
                    console.log('[deletePlayer] player is matching, success to cancel match', { tunnelId, openId })
                    existsPlayer.state = PLAYER_STATE.IN_HALL
                    self.playerInfos.remove(openId)
                } else {
                    // 该玩家目前状态不是匹配
                    console.log('[addPlayer] player is not matching, delete it', { tunnelId, openId })
                    self.playerInfos.remove(openId)
                }
            }
            self.tunnelManager.emit(OUT_MESSAGE.CancelMatchSuccess, {}, tunnelId)
        } catch (e) {
            self.tunnelManager.emit(OUT_MESSAGE.CancelMatchError, { 'error': e }, tunnelId)
        }
    }

    /**
     * 把参与匹配的玩家都丢入匹配池，每个玩家记录两个属性（分数、开始匹配的时间），循环遍历匹配池中所有分数段，找出每个分数上等待时间最长的玩家，用他的范围来进行匹配
     * （因为匹配范围会因为等待时间边长而增加，等待时间最长的的玩家匹配范围最大，如果连他都匹配不够，那同分数段的其他玩家就更匹配不够了）。
     * 如果匹配到了足够的人，那就把这些人从匹配池中移除，匹配成功；如果匹配人到的人数不够并且没有达到最大匹配时间，则跳过等待下一次匹配；
     * 如果达到最大匹配时间，还是没匹配到足够的人，则给这个几个人凑机器人，提交匹配成功。
     */
    match () {
        var self = this
        if (self.matchState === MATCH_STATE.MATCHING) {
            return
        }
        if (self.playerInfos.count() <= 1) {
            self.afterMatch()
            return
        }
        self.matchState = MATCH_STATE.MATCHING
        try {
            console.log('[match] start match, matchState = ' + this.matchState + ', playerSize = ' + self.playerInfos.count())
            var matchPlayers = []
            // 将匹配池中所有玩家选出
            self.playerInfos.forEach(function (openId, player) {
                var matchPlayer = UnitTools.deepCopy(player)
                matchPlayers.push(matchPlayer)
            })
            console.log(`[match] matchPlayers =>`, {matchPlayers})
            if (matchPlayers.length > 1) {
                // 按开始匹配时间降序排列
                matchPlayers.sort(function (a, b) { return b.matchTime - a.matchTime })
                console.log(`[match] sort matchPlayers =>`, {matchPlayers})
                var waitPlayer = null
                var i = matchPlayers.length
                while (i--) {
                    var player = matchPlayers[i]
                    if (!waitPlayer) {
                        waitPlayer = player
                        matchPlayers.splice(i, 1)
                        continue
                    }
                    if (player.openId === waitPlayer.openId) {
                        waitPlayer = null
                        if (waitPlayer.tunnelId) {
                            console.log(`[match] 最早的这个玩家是重新连接上来的，把断线之前的删除, tunnelId = ` + waitPlayer.tunnelId)
                            self.playerInfos.remove(waitPlayer.tunnelId)
                        }
                        continue
                    }
                    // 判断分差
                    if (player.score - waitPlayer.score <= Math.abs(waitPlayer.scoreDiff)) {
                        // 符合条件则为匹配成功，接下来检查信道是否正常，正常则发送匹配成功通知
                        if (!self.tunnelManager.tunnelInfos.hasKey(waitPlayer.tunnelId) || self.tunnelManager.connectedTunnelIds.indexOf(waitPlayer.tunnelId) === -1) {
                            // waitPlayer 不符合要求
                            console.log(`[match] waitPlayer 不符合要求, tunnelId = ` + waitPlayer.tunnelId)
                            self.playerInfos.remove(waitPlayer.tunnelId)
                            waitPlayer = null
                            continue
                        }
                        if (!self.tunnelManager.tunnelInfos.hasKey(player.tunnelId) || self.tunnelManager.connectedTunnelIds.indexOf(player.tunnelId) === -1) {
                            // player 不符合要求
                            console.log(`[match] player 不符合要求, tunnelId = ` + player.tunnelId)
                            self.playerInfos.remove(player.tunnelId)
                            matchPlayers.splice(i, 1)
                            continue
                        }
                        // 匹配成功，创建房间并发送通知
                        var roomId = UnitTools.genID()
                        self.playerInfos.remove(waitPlayer.openId)
                        self.playerInfos.remove(player.openId)
                        // CREATE ROOM AND JOIN
                        if (!self.reversi.createTable(waitPlayer.openId, roomId, null, PLAYER_STATE.MATCH_SUCCESS)) {
                            self.playerManager.updatePlayerState(waitPlayer.openId, PLAYER_STATE.IN_HALL)
                            self.playerManager.updatePlayerState(player.openId, PLAYER_STATE.IN_HALL)
                            self.tunnelManager.emit(OUT_MESSAGE.MatchError, { 'code': Codes.CREATE_ROOM_ERROR }, waitPlayer.tunnelId)
                            self.tunnelManager.emit(OUT_MESSAGE.MatchError, { 'code': Codes.CREATE_ROOM_ERROR }, player.tunnelId)
                        }
                        if (!self.reversi.joinTable(player.openId, roomId, PLAYER_STATE.MATCH_SUCCESS)) {
                            self.playerManager.updatePlayerState(waitPlayer.openId, PLAYER_STATE.IN_HALL)
                            self.playerManager.updatePlayerState(player.openId, PLAYER_STATE.IN_HALL)
                            self.tunnelManager.emit(OUT_MESSAGE.MatchError, { 'code': Codes.JOIN_ROOM_ERROR }, waitPlayer.tunnelId)
                            self.tunnelManager.emit(OUT_MESSAGE.MatchError, { 'code': Codes.JOIN_ROOM_ERROR }, player.tunnelId)
                        }
                        console.log(`[match] match success => `, {waitPlayer, player})
                        self.tunnelManager.emit(OUT_MESSAGE.MatchSuccess, {'roomId': roomId, 'stand': self.playerManager.getPos(waitPlayer.openId)}, waitPlayer.tunnelId)
                        self.tunnelManager.emit(OUT_MESSAGE.MatchSuccess, {'roomId': roomId, 'stand': self.playerManager.getPos(player.openId)}, player.tunnelId)
                    }
                }
            }
            self.afterMatch()
        } catch (e) {
            console.log(e)
        } finally {
            self.matchState = MATCH_STATE.FREE
        }
    }

    /**
     * 匹配之后，如果匹配池有剩余玩家，并且这些玩家已到指定匹配时间，则给UI或发送匹配失败通知
     */
    afterMatch () {
        var self = this
        if (self.playerInfos.count() > 0) {
            self.playerInfos.forEach(function (tunnelId, player) {
                if (UnitTools.isTimeOut(player.matchTime, self.maxTimeWait)) {
                    // 超时
                    player.state = PLAYER_STATE.IN_HALL
                    self.tunnelManager.emit(OUT_MESSAGE.MatchTimeout, {}, player.tunnelId)
                } else if (player.scoreDiff < self.maxScoreDiff) {
                    // 否则加大下次检索分数
                    player.scoreDiff += self.perScoreDiff
                }
            })
        }
    }

}

MatchManager.g_instance = null

module.exports = MatchManager
