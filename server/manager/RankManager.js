const { mysql } = require('../qcloud')

class RankManager {

    /**
     * 获取周排行
     * @returns [{nickname: 'aa', avatarUrl: 'bb', rank: 1, weeklyWinCnt: 10},..]
     */
    async getWeeklyRank () {
        console.log('getWeeklyRank,  start')
        let res = await mysql('cSettlement').select('*').orderBy('weekly_win_cnt', 'desc').limit(10)
        console.log('getWeeklyRank, res =>', res)
        let ranks = []
        for (let i in res) {
            if (res.hasOwnProperty(i)) {
                ranks.push({
                    nickname: res[i].nickname,
                    avatarUrl: res[i].avatarUrl,
                    rank: i,
                    winCnt: res[i].weekly_win_cnt
                })
            }
        }
        console.log('getWeeklyRank, ranks =>', ranks)
        return ranks
    }

    async getMonthlyRank () {
        console.log('getMonthlyRank,  start')
        // let res = await mysql('cSettlement').select('*').orderBy('monthly_win_cnt', 'desc').limit(100)
        let res = await mysql('cSettlement').select('*').orderBy('win_cnt', 'desc').limit(10)
        console.log('getMonthlyRank, res =>', res)
        let ranks = []
        for (let i in res) {
            if (res.hasOwnProperty(i)) {
                ranks.push({
                    nickname: res[i].nickname,
                    avatarUrl: res[i].avatarUrl,
                    rank: i,
                    // winCnt: res[i].monthly_win_cnt
                    winCnt: res[i].win_cnt
                })
            }
        }
        console.log('getMonthlyRank, ranks =>', ranks)
        return ranks
    }
}

RankManager.g_instance = new RankManager()

module.exports = RankManager.g_instance
