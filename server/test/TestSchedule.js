const schedule = require('node-schedule')

/**
 * run 'npm test' at Terminal
 */
describe('测试定时器', function () {
    console.info('开始测试定时器')
    schedule.scheduleJob('*/5 * * * * *', function () {
        console.info('开始测试')
    })
})
