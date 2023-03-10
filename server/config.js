const CONF = {
    port: '5757',
    rootPathname: '',

    // 微信小游戏 App ID
    appId: 'wx23b4bc8a4dce7c9f',

    // 微信小游戏 App Secret
    appSecret: '907fd263fd5aadd280e3d797a89dd01b',

    // 是否使用腾讯云代理登录小游戏
    useQcloudLogin: false,

    /**
     * MySQL 配置，用来存储 session 和用户信息
     * 若使用了腾讯云微信小游戏解决方案
     * 开发环境下，MySQL 的初始密码为您的微信小游戏 appid
     */
    mysql: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        db: 'cAuth',
        pass: 'wxcdf683feecd9f9dc',
        char: 'utf8mb4'
    },

    cos: {
        /**
         * 地区简称
         * @查看 https://cloud.tencent.com/document/product/436/6224
         */
        region: 'ap-guangzhou',
        // Bucket 名称
        fileBucket: 'qcloudtest',
        // 文件夹
        uploadFolder: ''
    },

    // 微信登录态有效期
    wxLoginExpires: 7200,
    wxMessageToken: 'abcdefgh'
    // // 其他配置 ...
    // serverHost: 'www.reversi.xyz',
    // tunnelServerUrl: 'https://tunnel.ws.qcloud.la',
    // tunnelSignatureKey: '27fb7d1c161b7ca52d73cce0f1d833f9f5b5ec89',
  	// // 腾讯云相关配置可以查看云 API 秘钥控制台：https://console.qcloud.com/capi
    // qcloudAppId: '1257011363',
    // qcloudSecretId: 'AKID84kBOLHWj9ML5a4seAQQAesqY0FFcWnp',
    // qcloudSecretKey: 'va092jBNIxMVO2QgiW5PUKwJRKzOYUBd',
    // wxMessageToken: 'weixinmsgtoken',
    // networkTimeout: 30000
}

module.exports = CONF
