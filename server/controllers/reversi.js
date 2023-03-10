const playerManager = require('../manager/PlayerManager.js')
const roomManager = require('../manager/RoomManager.js')
const settlementService = require('../service/SettlementService.js')
const RankManager = require('../manager/RankManager.js')
const UnitTools = require('../tools/UnitTools.js')

module.exports = {
    /**
     * 获取玩家信息
     * @param ctx
     * @returns {Promise<void>}
     */
    getPlayer: async ctx => {
        console.log('reversi getPlayer start')
        if (ctx.state.$wxInfo.loginState === 1) {
            // loginState 为 1，登录态校验成功
            if (UnitTools.isNullOrUndefined(ctx.state.$wxInfo.userinfo)) {
                ctx.state.code = -2
                return
            }
            let player = playerManager.getPlayer(ctx.state.$wxInfo.userinfo.openId)
            if (UnitTools.isNullOrUndefined(player)) {
                ctx.state.code = -3
                return
            }
            ctx.state.data = player
        } else {
            ctx.state.code = -1
        }
    },

    /**
     * 获取房间信息
     * @param ctx
     * @returns {Promise<void>}
     */
    getRoomInfo: async ctx => {
        console.log('getRoomInfo start')
        if (ctx.state.$wxInfo.loginState === 1) {
            // loginState 为 1，登录态校验成功
            if (UnitTools.isNullOrUndefined(ctx.state.$wxInfo.userinfo)) {
                ctx.state.code = -2
                return
            }
            var tableId = playerManager.getTableId(ctx.state.$wxInfo.userinfo.openId)
            console.log('getRoomInfo tableId == ' + tableId)
            if (UnitTools.isNullOrUndefined(tableId)) {
                ctx.state.code = -3
                return
            }
            var table = roomManager.getTable(tableId)
            console.log('getRoomInfo table => ', { table })
            if (UnitTools.isNullOrUndefined(table)) {
                ctx.state.code = -4
                return
            }
            if (table.isUnavailable()) {
                ctx.state.code = 1
                return
            }
            var me = playerManager.getPlayer(ctx.state.$wxInfo.userinfo.openId)
            console.log('getRoomInfo me => ', { me })
            if (UnitTools.isNullOrUndefined(me)) {
                ctx.state.code = -5
                return
            }
            var opponent = null
            table.eachPos(function (pos) {
                var eachPlayer = playerManager.getPlayer(table.getPidWithPos(pos))
                console.log('getRoomInfo eachPlayer => ', { eachPlayer })
                if (UnitTools.isNullOrUndefined(eachPlayer) || UnitTools.isNullOrUndefined(eachPlayer.tunnelId) || me.tunnelId !== eachPlayer.tunnelId) {
                    // 目前只有2个玩家，可以这样写
                    opponent = eachPlayer
                }
            })
            ctx.state.data = {'me': me, 'opponent': opponent, 'roomId': tableId}
        } else {
            ctx.state.code = -1
        }
    },

    /**
     * 获得游戏信息
     * @param ctx
     * @returns {Promise<void>}
     */
    getGameInfo: async ctx => {
        if (ctx.state.$wxInfo.loginState === 1) {
            // loginState 为 1，登录态校验成功
            if (UnitTools.isNullOrUndefined(ctx.state.$wxInfo.userinfo)) {
                ctx.state.code = -2
                return
            }
            var tableId = playerManager.getTableId(ctx.state.$wxInfo.userinfo.openId)
            if (UnitTools.isNullOrUndefined(tableId)) {
                ctx.state.code = -3
                return
            }
            var table = roomManager.getTable(tableId)
            if (UnitTools.isNullOrUndefined(table)) {
                ctx.state.code = -4
                return
            }
            var logic = table.getLogic()
            if (UnitTools.isNullOrUndefined(logic)) {
                ctx.state.code = -5
                return
            }
            ctx.state.data = logic.getChessInfo()
        } else {
            ctx.state.code = -1
        }
    },

    /**
     * 获取当前回合剩余时间
     * @param ctx
     * @returns {Promise<void>}
     */
    getTimeLeft: async ctx => {
        if (ctx.state.$wxInfo.loginState === 1) {
            // loginState 为 1，登录态校验成功
            if (UnitTools.isNullOrUndefined(ctx.state.$wxInfo.userinfo)) {
                ctx.state.code = -2
                return
            }
            var tableId = playerManager.getTableId(ctx.state.$wxInfo.userinfo.openId)
            if (UnitTools.isNullOrUndefined(tableId)) {
                ctx.state.code = -3
                return
            }
            var table = roomManager.getTable(tableId)
            if (UnitTools.isNullOrUndefined(table)) {
                ctx.state.code = -4
                return
            }
            var logic = table.getLogic()
            if (UnitTools.isNullOrUndefined(logic)) {
                ctx.state.code = -5
                return
            }
            ctx.state.data = logic.getTimeLeft()
        } else {
            ctx.state.code = -1
        }
    },

    /**
     * 获取最近一次的结算信息
     * @param ctx
     * @returns {Promise<void>}
     */
    getSettlement: async ctx => {
        if (ctx.state.$wxInfo.loginState === 1) {
            // loginState 为 1，登录态校验成功
            if (UnitTools.isNullOrUndefined(ctx.state.$wxInfo.userinfo)) {
                ctx.state.code = -2
                return
            }
            ctx.state.data = await settlementService.querySettleMent(ctx.state.$wxInfo.userinfo.openId)
        } else {
            ctx.state.code = -1
        }
    },

    /**
     * 购买物品
     * @param ctx
     * @returns {Promise<void>}
     */
    purchaseItem: async ctx => {
        var openId = ctx.state.$wxInfo.userinfo.openId
        var requestData = ctx.request.body.data
        var itemType = requestData.itemType
        var itemId = requestData.itemId
        var res = await settlementService.buyItemByOpenId(openId, itemType, itemId)
        if (res === 1) {
            ctx.state.data = {'code': 1, 'message': 'NOT ENOUGH GOLD'}
        } else if (res === 2) {
            ctx.state.data = {'code': 2, 'message': 'SYSTEM ERROR'}
        } else {
            ctx.state.data = {'code': 0, 'message': 'SUCCESS'}
        }
    },

    /**
     * 购买物品
     * @param ctx
     * @returns {Promise<void>}
     */
    activeItem: async ctx => {
        var openId = ctx.state.$wxInfo.userinfo.openId
        var requestData = ctx.request.body.data
        var itemType = requestData.itemType
        var itemId = requestData.itemId
        var res = await settlementService.activeItemByOpenId(openId, itemType, itemId)
        if (res === 1) {
            ctx.state.code = -1
            ctx.state.data = {'code': 1, 'message': 'NO ITEM'}
        }
        else {
            ctx.state.data = {'code': 0, 'message': 'SUCCESS'}
        }
    },

    /**
     * 投降
     * @param ctx
     * @returns {Promise<void>}
     */
    userSurrender: async ctx => {
        if (ctx.state.$wxInfo.loginState === 1) {
            // loginState 为 1，登录态校验成功
            if (UnitTools.isNullOrUndefined(ctx.state.$wxInfo.userinfo)) {
                ctx.state.code = -2
                return
            }
            var tableId = playerManager.getTableId(ctx.state.$wxInfo.userinfo.openId)
            if (UnitTools.isNullOrUndefined(tableId)) {
                ctx.state.code = -3
                return
            }
            var table = roomManager.getTable(tableId)
            if (UnitTools.isNullOrUndefined(table)) {
                ctx.state.code = -4
                return
            }
            var logic = table.getLogic()
            if (UnitTools.isNullOrUndefined(logic)) {
                ctx.state.code = -5
                return
            }
            logic.surrender(ctx.state.$wxInfo.userinfo.openId)
        } else {
            ctx.state.code = -1
        }
    },

    /**
     * 获得公告信息
     * @param ctx
     * @returns {Promise<void>}
     */
    getNotice: async ctx => {
        ctx.state.code = 0
        ctx.state.data = '抵制不良游戏 拒绝盗版游戏 注意自我保护 谨防受骗上当\n' +
            '适度游戏益脑 沉迷游戏伤身 合理安排时间 享受健康生活';
    },

    /**
     * 获取对手信息
     * @param ctx
     * @returns {Promise<void>}
     */
    getOpponent: async ctx => {
        if (ctx.state.$wxInfo.loginState === 1) {
            // loginState 为 1，登录态校验成功
            if (UnitTools.isNullOrUndefined(ctx.state.$wxInfo.userinfo)) {
                ctx.state.code = -2
                return
            }
            let openId = ctx.state.$wxInfo.userinfo.openId
            let tableId = playerManager.getTableId(openId)
            if (UnitTools.isNullOrUndefined(tableId)) {
                ctx.state.code = -3
                return
            }
            let table = roomManager.getTable(tableId)
            if (UnitTools.isNullOrUndefined(table)) {
                ctx.state.code = -4
                return
            }
            ctx.state.data = null
            table.eachPos(function (pos) {
                if (table.getPidWithPos(pos) !== openId) {
                    ctx.state.data = playerManager.getPlayer(table.getPidWithPos(pos))
                    ctx.state.code = 0
                }
            })
        } else {
            ctx.state.code = -1
        }
    },

    /**
     * 周排行 最多拉取top100
     * @param ctx
     * @returns {Promise<void>}
     */
    weeklyRank: async ctx => {
        console.log('reversi weeklyRank')
        var res = await RankManager.getWeeklyRank()
        ctx.state.data = res
    },

    /**
     * 日排行
     * @param ctx
     * @returns {Promise<void>}
     * @constructor
     */
    monthlyRank: async ctx => {
        console.log('reversi monthlyRank')
        var res = await RankManager.getMonthlyRank()
        ctx.state.date = res
    }

}
