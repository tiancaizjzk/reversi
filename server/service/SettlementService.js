const { GAME_RESULT, PLAYER_STATE, DEFAULT_RATING, COIN_DELTA,
    DEFAULT_HEAD_FRAMES, DEFAULT_CHESSES, DEFAULT_BOARDS, ITEMS } = require('../model/enums/constants.js')
const { mysql } = require('../qcloud')
const moment = require('moment')
var PlayerManager = require('../manager/PlayerManager.js')
var UnitTools = require('../tools/UnitTools.js')

class SettlementService {

    constructor () {
        this.playerManager = PlayerManager
    }

    /**
     * 转换游戏结果
     * @param gameResult
     */
    convertGameResult (gameResult) {
        if (gameResult === GAME_RESULT.WIN) {
            return GAME_RESULT.LOSS
        } else if (gameResult === GAME_RESULT.LOSS) {
            return GAME_RESULT.WIN
        } else {
            return GAME_RESULT.DRAW
        }
    }

    /**
     * 结算操作
     * 仅进行数据运算和存储
     * @param logic
     */
    async doSettlement (userOpenId, userRating, opponentOpenId, opponentRating, gameResult) {
        var userRatingInfo = this.getRatingDelta(userRating, opponentRating, gameResult)
        var opponentGameResult = this.convertGameResult(gameResult)
        var opponentRatingInfo = this.getRatingDelta(opponentRating, userRating, opponentGameResult)

        await this.saveSettlementInfo(userOpenId, opponentOpenId, gameResult, userRatingInfo.ratingDelta,
            userRatingInfo.ratingDelta)
        await this.saveSettlementInfo(opponentOpenId, userOpenId, opponentGameResult, opponentRatingInfo.ratingDelta,
            opponentRatingInfo.ratingDelta)
        return {
            userRating: userRatingInfo.newRating,
            opponentRating: opponentRatingInfo.newRating
        }
    }

    /**
     * 计算积分信息
     * @param {int} myRating
     * @param {int} opponentRating
     * @param {int} myGameResult
     * @return {ratingDelta, newRating}
     */
    getRatingDelta (myRating, opponentRating, myGameResult) {
        if (myGameResult === GAME_RESULT.DRAW) {
            myGameResult = 0.5
        } else if (myGameResult === GAME_RESULT.WIN) {
            myGameResult = 1
        }

        let myChanceToWin = 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400))

        let ratingDelta = Math.round(32 * (myGameResult - myChanceToWin))

        let newRating = myRating + ratingDelta

        return {
            ratingDelta: ratingDelta,
            newRating: newRating
        }
    }

    /**
     * 储存用户结算信息
     * @param {string} userOpenId
     * @param {string} opponentOpenId
     * @param {int} result
     * @param {int} scoreResultDelta
     * @param {int} ratingResultDelta
     * @return {Promise}
     */
    saveSettlementInfo (userOpenId, opponentOpenId, result, scoreResultDelta, ratingResultDelta) {
        const createTime = moment().format('YYYY-MM-DD HH:mm:ss')

        // 查重并决定是插入还是更新数据
        return mysql('cSettlement').select('*').where({
            open_id: userOpenId
        }).first()
            .then(res => {
                var player = this.playerManager.getPlayer(userOpenId)
                // 如果存在用户则更新
                if (!UnitTools.isNullOrUndefined(res)) {
                    const winCnt = result ? res.win_cnt + 1 : res.win_cnt
                    const weeklyWinCnt = result ? res.weekly_win_cnt + 1 : res.weekly_win_cnt
                    const monthlyWinCnt = result ? res.monthly_win_cnt + 1 : res.monthly_win_cnt
                    const loseCnt = result ? res.lose_cnt : res.lose_cnt + 1
                    const coin = result ? res.coin + COIN_DELTA : res.coin >= COIN_DELTA ? res.coin - COIN_DELTA : 0
                    player.win_cnt = winCnt
                    player.weekly_win_cnt = weeklyWinCnt
                    player.monthly_win_cnt = monthlyWinCnt
                    player.lose_cnt = loseCnt
                    player.coin = coin

                    return mysql('cSettlement').update({
                        nickname: player.nickName,
                        avatarUrl: player.avatarUrl,
                        win_cnt: winCnt,
                        weekly_win_cnt: weeklyWinCnt,
                        monthly_win_cnt: monthlyWinCnt,
                        lose_cnt: loseCnt,
                        latest_opponent_open_id: opponentOpenId,
                        latest_result: result,
                        score: res.score + scoreResultDelta,
                        latest_score_delta: scoreResultDelta,
                        rating: res.rating + ratingResultDelta,
                        latest_rating_delta: ratingResultDelta,
                        coin: coin
                    }).where({
                        open_id: userOpenId
                    })
                } else {
                    player.win_cnt = result ? 1 : 0
                    player.weekly_win_cnt = result ? 1 : 0
                    player.monthly_win_cnt = result ? 1 : 0
                    player.lose_cnt = result ? 0 : 1
                    return mysql('cSettlement').insert({
                        open_id: userOpenId,
                        nickname: player.nickName,
                        avatarUrl: player.avatarUrl,
                        win_cnt: result ? 1 : 0,
                        weekly_win_cnt: result ? 1 : 0,
                        monthly_win_cnt: result ? 1 : 0,
                        lose_cnt: result ? 0 : 1,
                        latest_opponent_open_id: opponentOpenId,
                        latest_result: result,
                        score: DEFAULT_RATING + scoreResultDelta,
                        latest_score_delta: scoreResultDelta,
                        rating: DEFAULT_RATING + ratingResultDelta,
                        latest_rating_delta: ratingResultDelta,
                        create_time: createTime,
                        coin: player.coin,
                        headFrames: JSON.stringify(player.headFrames),
                        chesses: JSON.stringify(player.chesses),
                        boards: JSON.stringify(player.boards)
                    })
                }
            })
            .then(() => ({
                userOpenId: userOpenId
            }))
            .catch(e => {
                throw new Error(`DB ERROR`, {e})
            })
    }

    /**
     * 通过 openid 获取用户信息
     * @param {string} openid 用户的 openid
     */
    getSettlementInfoByOpenId (openId) {
        if (!openId) {
            return null
        }
        return mysql('cSettlement').select('*').where({ open_id: openId }).first()
    }

    /**
     * 通过 openid 更新cSettlement
     * @param {string} openid 用户的 openid
     * @param {object} params 更新参数
     */
    async updateSettlementInfoByOpenId (openId, params) {
        if (!openId) {
            return null
        }
        try {
            await mysql('cSettlement').where({open_id: openId}).update(params)
        } catch (e) {
            throw new Error(`DB ERROR`, {e})
        }
    }

    /**
     * 通过 openid 购买物品
     * @param {string} openid 用户的 openid
     * @param {string} itemType 物品类型
     * @param {int} params 物品id
     */
    async buyItemByOpenId (openId, itemType, itemId) {
        var self = this
        if (!openId) {
            console.log('buyItemByOpenId => no openid', {itemType, itemId})
            return 2
        }
        var player = this.playerManager.getPlayer(openId)
        if (!(itemType in ITEMS)) {
            console.log('buyItemByOpenId => illegal itemType', {itemType, itemId})
            return 2
        }
        var res = 0
        ITEMS[itemType].forEach(item => {
            if (item.itemId === itemId) {
                player[itemType].forEach(playerItem => {
                    if (playerItem.itemId === itemId) {
                        console.log('buyItemByOpenId => owned this item', {itemType, itemId})
                        res = 2
                    }
                })
                const price = item.price
                if (player.coin < price) {
                    console.log('buyItemByOpenId => coin < price', {itemType, itemId})
                    res = 1
                }
                if (res === 0) {
                    player.coin = player.coin - price
                    player[itemType].push({
                        itemId: itemId,
                        isActive: 0
                    })
                    var params = {coin: player.coin}
                    params[itemType.toString()] = JSON.stringify(player[itemType])
                    self.updateSettlementInfoByOpenId(openId, params)
                }
            }
        })
        return res
    }

    /**
     * 通过 openid 激活物品
     * @param {string} openid 用户的 openid
     * @param {string} itemType 物品类型
     * @param {int} params 物品id
     */
    async activeItemByOpenId (openId, itemType, itemId) {
        var self = this
        if (!openId) {
            return null
        }
        var player = this.playerManager.getPlayer(openId)
        if (!(itemType in ITEMS)) {
            return null
        }
        var itemTurn = itemId % 2
        player[itemType].forEach(playerItem => {
            if (playerItem.itemId === itemId) {
                if (playerItem.isActive === 1) {
                    playerItem.isActive = 0
                } else {
                    playerItem.isActive = 1
                }
            } else {
                if (playerItem.itemId % 2 === itemTurn) {
                    playerItem.isActive = 0
                }
            }

        })
        var params = {}
        params[itemType.toString()] = JSON.stringify(player[itemType])
        self.updateSettlementInfoByOpenId(openId, params)
        return null
    }

    /**
     * 结算结果查询
     * @param openId
     * @returns {Promise<any>}
     */
    querySettleMent (openId) {
        var self = this
        var player = self.playerManager.getPlayer(openId)
        var score = null
        var scoreDelta = null
        var result = null
        var opponent = null
        var opponentResult = null
        var scoreResult = null
        return new Promise(function (resolve, reject) {
            self.getSettlementInfoByOpenId(openId).then(
                res => {
                    if (!UnitTools.isNullOrUndefined(res)) {
                        score = res.rating
                        scoreDelta = res.latest_score_delta
                        result = res.latest_result
                        opponent = self.playerManager.getPlayer(res.latest_opponent_open_id)
                        opponentResult = self.convertGameResult(res.result)
                        scoreResult = {'score': score, 'scoreDelta': scoreDelta}
                    } else {
                        player.score = DEFAULT_RATING
                    }
                    self.playerManager.updatePlayerState(openId, PLAYER_STATE.IN_HALL)
                    resolve({'player': player, 'result': result, 'opponent': opponent, 'opponentResult': opponentResult, 'scoreResult': scoreResult})
                }
            )
        })
    }

    /**
     * 玩家分数查询
     * @param openId
     * @returns {Promise<any>}
     */
    queryPlayerScore (openId) {
        var self = this
        return new Promise(function (resolve, reject) {
            self.getSettlementInfoByOpenId(openId).then(
                res => {
                    if (!UnitTools.isNullOrUndefined(res)) {
                        resolve({score: res.rating,
                            coin: res.coin,
                            headFrames: res.headFrames,
                            chesses: res.chesses,
                            boards: res.boards
                        })
                    } else {
                        resolve({score: DEFAULT_RATING,
                            coin: 200,
                            headFrames: '[]',
                            chesses: '[]',
                            boards: '[]'
                        })
                    }
                }
            )
        })
    }

}

SettlementService.g_instance = new SettlementService()

module.exports = SettlementService.g_instance
