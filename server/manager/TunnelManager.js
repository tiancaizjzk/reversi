const {tunnel} = require('../qcloud')
var Map = require('../tools/Map.js')
var PlayerManager = require('./PlayerManager.js')
var EventEmitter = require('events').EventEmitter
var UnitTools = require('../tools/UnitTools.js')
const { ON_MESSAGE } = require('../model/enums/constants.js')

class TunnelManager {

    constructor () {
        this.connectedTunnelIds = []
        this.tunnelInfos = new Map() // key = tunnelId, value = openId
        this.playerManager = PlayerManager
        this.event = new EventEmitter()
    }

    /**
     * 单点推送
     * @param type
     * @param content
     * @param tunnelId
     */
    emit (type, content, tunnelId) {
        console.log(`[emit] =>`, {type, content, tunnelId})
        var self = this
        tunnel.broadcast([tunnelId], type, content)
        .then(result => {
            var invalidTunnelIds = result.data && result.data.invalidTunnelIds || []
            if (invalidTunnelIds.length) {
                console.log('检测到无效的信道 IDs =>', invalidTunnelIds)
                invalidTunnelIds.forEach(tunnelId => {
                    self.delTunnel(tunnelId)
                })
            }
        })
    }

    /**
     * 进行除了自己之外的广播
     * @param type
     * @param content
     * @param tunnelId
     * @param tunnelIds
     */
    inform (type, content, tunnelId, tunnelIds) {
        console.log(`[inform] =>`, {type, content, tunnelId, tunnelIds})
        var self = this
        let targetTunnelIds = tunnelIds ? self.connectedTunnelIds.slice(0) : tunnelIds.slice(0)
        targetTunnelIds.splice(targetTunnelIds.indexOf(tunnelId), 1)
        tunnel.broadcast(targetTunnelIds, type, content)
        .then(result => {
            var invalidTunnelIds = result.data && result.data.invalidTunnelIds || []
            if (invalidTunnelIds.length) {
                console.log('检测到无效的信道 IDs =>', invalidTunnelIds)
                invalidTunnelIds.forEach(tunnelId => {
                    self.delTunnel(tunnelId)
                })
            }
        })
    }

    /**
     * 广播
     * @param type
     * @param content
     * @param tunnelIds
     */
    broadcast (type, content, tunnelIds) {
        console.log(`[broadcast] =>`, {type, content, tunnelIds})
        var self = this
        tunnel.broadcast(tunnelIds ? self.connectedTunnelIds : tunnelIds, type, content)
        .then(result => {
            var invalidTunnelIds = result.data && result.data.invalidTunnelIds || []
            if (invalidTunnelIds.length) {
                console.log('检测到无效的信道 IDs =>', invalidTunnelIds)
                invalidTunnelIds.forEach(tunnelId => {
                    self.delTunnel(tunnelId)
                })
            }
        })
    }

    /**
     * 关闭信道
     * @param tunnelId
     */
    close (tunnelId) {
        console.log(`[close] =>`, {tunnelId})
        tunnel.closeTunnel(tunnelId)
    }

    /**
     * 删除维护中的信道信息，不包括CLOSE
     * @param tunnelId
     */
    delTunnel (tunnelId) {
        console.log(`[delTunnel] =>`, {tunnelId})
        var self = this
        self.tunnelInfos.remove(tunnelId)
        var index = self.connectedTunnelIds.indexOf(tunnelId)
        if (~index) {
            self.connectedTunnelIds.splice(index, 1)
        }
        var player = self.getPlayerByTunnelId(tunnelId)
        if (!UnitTools.isNullOrUndefined(player)) {
            self.playerManager.updatePlayerTunnelId(player.openId, null)
        }
    }

    /**
     * 实现 onConnect 方法
     * 在客户端成功连接 WebSocket 信道服务之后会调用该方法
     * @param tunnelId
     */
    onConnect (tunnelId) {
        console.log(`[onConnect] =>`, {tunnelId})
        var self = this
        if (self.tunnelInfos.hasKey(tunnelId) && !self.connectedTunnelIds.includes(tunnelId)) {
            self.connectedTunnelIds.push(tunnelId)
        } else {
            console.log(`Unknown tunnelId(${tunnelId}) was connected, close it`)
            self.close(tunnelId)
        }
    }

    /**
     * 实现 onMessage 方法
     * @param tunnelId
     * @param type
     * @param content
     */
    onMessage (tunnelId, type, content) {
        console.log(`[onMessage] =>`, {tunnelId, type, content})
        var self = this
        if (!self.tunnelInfos.hasKey(tunnelId)) {
            console.log(`[onMessage][Invalid TunnelId]=>`, tunnelId)
            self.close(tunnelId)
            return
        }
        self.event.emit(type, tunnelId, content)
    }

    /**
     * onMessage 的具体实现接口 onType
     * @param type
     * @param cb 必须包含tunnelId, content
     */
    onType (type, cb) {
        var self = this
        self.event.on(type, cb)
    }

    /**
     * 实现 onClose 方法
     * 客户端关闭 WebSocket 信道或者被信道服务器判断为已断开后
     * @param tunnelId
     */
    onClose (tunnelId) {
        console.log(`[onClose] =>`, {tunnelId})
        var self = this
        if (!(self.tunnelInfos.hasKey(tunnelId))) {
            console.log(`[onClose][Invalid TunnelId]=>`, tunnelId)
            self.close(tunnelId)
            return
        }
        self.delTunnel(tunnelId)
        self.event.emit(ON_MESSAGE.Close, tunnelId)
    }

    /**
     * 根据 tunnelId 获得 player
     * @param tunnelId
     */
    getPlayerByTunnelId (tunnelId) {
        console.log(`[getPlayerByTunnelId] =>`, {tunnelId})
        var self = this
        var openId = self.tunnelInfos.getNotCreate(tunnelId)
        if (UnitTools.isNullOrUndefined(openId)) {
            return null
        }
        return self.playerManager.getPlayer(openId)
    }

    /**
     * 获得在线人数
     */
    getOnlineNums () {
        return this.connectedTunnelIds.length
    }

}

TunnelManager.g_instance = new TunnelManager()

module.exports = TunnelManager.g_instance
