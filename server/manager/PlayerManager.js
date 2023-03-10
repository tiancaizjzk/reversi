var Map = require('../tools/Map.js')
var UnitTools = require('../tools/UnitTools.js')
const { mysql } = require('../qcloud')
const moment = require('moment')
const { PLAYER_STATE, DEFAULT_RATING } = require('../model/enums/constants.js')

class PlayerManager {

    constructor () {
        this.playerInfos = new Map() // key = openId
    }

    /**
     * 获得player
     * @param openId
     * @return 返回玩家的基础信息
     */
    getPlayer (openId) {
        console.log(`[getPlayer] =>`, {openId})
        if (UnitTools.isNullOrUndefined(openId)) return null
        return this.playerInfos.getNotCreate(openId)
    }

    /**
     * 创建或更新 player，不包含 userInfo 和 skey
     * @param openId
     */
    async createOrUpdatePlayer (userInfo) {
        console.log(`[createOrUpdatePlayer] =>`, {userInfo})
        var self = this
        var player = self.getPlayer(userInfo.openId)
        if (UnitTools.isNullOrUndefined(player)) {
            // 新的用户于内存，需要创建
            player = UnitTools.deepCopy(userInfo)
            player.state = PLAYER_STATE.IN_HALL
        } else {
            // 更新用户基本信息
            player.nickName = userInfo.nickName
            player.gender = userInfo.gender
            player.language = userInfo.language
            player.city = userInfo.city
            player.province = userInfo.province
            player.country = userInfo.country
            player.avatarUrl = userInfo.avatarUrl
            player.watermark = userInfo.watermark
        }
        if (!UnitTools.isNullOrUndefined(userInfo.score)) {
            player.score = userInfo.score
        } else {
            player.score = DEFAULT_RATING
        }
        if (!UnitTools.isNullOrUndefined(userInfo.score)) {
            player.rating = userInfo.rating
        } else {
            player.rating = DEFAULT_RATING
        }
        player.coin = userInfo.coin
        player.headFrames = JSON.parse(userInfo.headFrames)
        player.chesses = JSON.parse(userInfo.chesses)
        player.boards = JSON.parse(userInfo.boards)
        this.playerInfos.setKeyValue(player.openId, player)
        // 查重并决定是插入还是更新数据
        await mysql('cSettlement').select('*').where({
            open_id: userInfo.openId
        }).first()
            .then(res => {
                if (UnitTools.isNullOrUndefined(res)) {
                    const createTime = moment().format('YYYY-MM-DD HH:mm:ss')
                    return mysql('cSettlement').insert({
                        open_id: userInfo.openId,
                        nickname: userInfo.nickName,
                        avatarUrl: userInfo.avatarUrl,
                        win_cnt: 0,
                        weekly_win_cnt: 0,
                        monthly_win_cnt: 0,
                        lose_cnt: 0,
                        latest_opponent_open_id: 0,
                        latest_result: 0,
                        score: DEFAULT_RATING,
                        latest_score_delta: 0,
                        rating: DEFAULT_RATING,
                        latest_rating_delta: 0,
                        create_time: createTime,
                        coin: player.coin,
                        headFrames: JSON.stringify(player.headFrames),
                        chesses: JSON.stringify(player.chesses),
                        boards: JSON.stringify(player.boards)
                    })
                }
            })
    }

    /**
     * 更新player状态
     * @param openId
     * @param state
     */
    updatePlayerState (openId, state) {
        console.log(`[updatePlayerState] =>`, {openId, state})
        var self = this
        var player = self.getPlayer(openId)
        if (!UnitTools.isNullOrUndefined(player)) {
            player.state = state
        } else {
            console.log(`[updatePlayerState] invalid openId =>`, {openId})
        }
    }

    /**
     * 更新player积分
     * @param openId
     * @param score
     */
    updatePlayerScore (openId, score) {
        console.log(`[updatePlayerScore] =>`, {openId, score})
        var self = this
        var player = self.getPlayer(openId)
        if (!UnitTools.isNullOrUndefined(player)) {
            player.score = score
        } else {
            console.log(`[updatePlayerScore] invalid openId =>`, {openId})
        }
    }

    /**
     * 更新 player tunnelId
     * @param openId
     * @param tunnelId
     */
    updatePlayerTunnelId (openId, tunnelId) {
        console.log(`[updatePlayerTunnelId] =>`, {openId, tunnelId})
        var self = this
        var player = self.getPlayer(openId)
        if (!UnitTools.isNullOrUndefined(player)) {
            player.tunnelId = tunnelId
        } else {
            console.log(`[updatePlayerTunnelId] invalid openId =>`, {openId})
        }
    }

    /**
     * 设置房间Id
     * @param openId
     * @param tableId
     */
    setTableId (openId, tableId) {
        console.log(`[setTableId] =>`, {openId, tableId})
        var info = this.getPlayer(openId)
        if (!UnitTools.isNullOrUndefined(info)) {
            info.tableId = tableId
        }
    }

    /**
     * 取得房间id
     * @param openId
     * @returns {*}
     */
    getTableId (openId) {
        var info = this.getPlayer(openId)
        if (UnitTools.isNullOrUndefined(info)) {
            return null
        }
        return info.tableId
    }

    /**
     * 设置玩家位置
     * @param openId
     * @param pos
     */
    setPos (openId, pos) {
        console.log(`[setPos] =>`, {openId, pos})
        var info = this.getPlayer(openId)
        if (!UnitTools.isNullOrUndefined(info)) {
            info.pos = pos
        }
    }

    /**
     * 获得玩家位置
     * @param openId
     * @returns {*}
     */
    getPos (openId) {
        var info = this.getPlayer(openId)
        if (UnitTools.isNullOrUndefined(info)) {
            return null
        }
        return info.pos
    }

    /**
     * 是否有该玩家
     * @param openId
     */
    hasPlayer (openId) {
        return this.playerInfos.hasKey(openId)
    }

}

PlayerManager.g_instance = new PlayerManager()

module.exports = PlayerManager.g_instance
