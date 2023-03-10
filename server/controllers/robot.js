const UnitTools = require('../tools/UnitTools.js')
const Robot = require('../core/Robot.js')

module.exports = {
    /**
     * 获取玩家信息
     * @param ctx
     * @returns {Promise<void>}
     */
    getExpect: async ctx => {
        if (ctx.state.$wxInfo.loginState === 1) {
            // loginState 为 1，登录态校验成功
            if (UnitTools.isNullOrUndefined(ctx.state.$wxInfo.userinfo)) {
                ctx.state.code = -2
            }
            var map = ctx.request.body.map
            var nowColor = ctx.request.body.nowColor
            var expect = Robot.getExpect(map, nowColor)
            ctx.state.data = expect
        } else {
            ctx.state.code = -1
        }
    }

}
