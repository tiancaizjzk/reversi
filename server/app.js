const Koa = require('koa')
const app = new Koa()
const debug = require('debug')('koa-weapp-demo')
const response = require('./middlewares/response')
const bodyParser = require('koa-bodyparser')
const config = require('./config')
const matchManager = require('./manager/MatchManager.js')
const friendManager = require('./manager/FriendManager.js')
const roomManager = require('./manager/RoomManager.js')
const schedule = require('node-schedule')

// 使用响应处理中间件
app.use(response)

// 解析请求体
app.use(bodyParser())

// 引入路由分发
const router = require('./routes')
app.use(router.routes())

// 启动匹配池
matchManager.instance()

// 启动好友房间
friendManager.instance()

// 启动程序，监听端口
app.listen(config.port, () => debug(`listening on port ${config.port}`))

// 循环匹配
schedule.scheduleJob('*/5 * * * * *', function () {
    matchManager.instance().match()
})

// 清扫战场
schedule.scheduleJob('*/5 * * * * *', function () {
    roomManager.clearTables()
})
