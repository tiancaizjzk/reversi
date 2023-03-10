const {tunnel} = require('../qcloud')
const debug = require('debug')('koa-weapp-demo')
const tunnelManager = require('../manager/TunnelManager.js')
const playerManager = require('../manager/PlayerManager.js')
const settlementService = require('../service/SettlementService.js')

module.exports = {
    // 小游戏请求 websocket 地址
    get: async ctx => {
        console.log('Tunnel get body')
        const data = await tunnel.getTunnelUrl(ctx.req)
        const tunnelInfo = data.tunnel
        // 先取player的分数
        let openId = data.userinfo.openId
        let score = await settlementService.queryPlayerScore(openId)
        data.userinfo.score = score.score
        data.userinfo.rating = score.score
        data.userinfo.coin = score.coin
        data.userinfo.headFrames = score.headFrames
        data.userinfo.chesses = score.chesses
        data.userinfo.boards = score.boards
        await playerManager.createOrUpdatePlayer(data.userinfo)
        tunnelManager.tunnelInfos.setKeyValue(tunnelInfo.tunnelId, openId)
        ctx.state.data = tunnelInfo
    },

    // 信道将信息传输过来的时候
    post: async ctx => {
        console.log('Tunnel post body')
        const packet = await tunnel.onTunnelMessage(ctx.request.body)

        debug('Tunnel receive a package: %o', packet)
        console.log('Tunnel receive a package: %o', packet)

        switch (packet.type) {
            case 'connect':
                tunnelManager.onConnect(packet.tunnelId)
                break
            case 'message':
                tunnelManager.onMessage(packet.tunnelId, packet.content.messageType, packet.content.messageContent)
                break
            case 'close':
                tunnelManager.onClose(packet.tunnelId)
                break
        }
    }

}
