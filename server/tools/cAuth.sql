/*
 Navicat Premium Data Transfer

 Source Server         : Localhost
 Source Server Type    : MySQL
 Source Server Version : 50717
 Source Host           : localhost
 Source Database       : cAuth

 Target Server Type    : MySQL
 Target Server Version : 50717
 File Encoding         : utf-8

 Date: 08/10/2017 22:22:52 PM
*/

SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `cSessionInfo`
-- ----------------------------
DROP TABLE IF EXISTS `cSessionInfo`;
CREATE TABLE `cSessionInfo` (
  `open_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uuid` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skey` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_visit_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `session_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_info` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`open_id`),
  KEY `openid` (`open_id`) USING BTREE,
  KEY `skey` (`skey`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话管理用户信息';

SET FOREIGN_KEY_CHECKS = 1;


SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `cSettlement`
-- ----------------------------
DROP TABLE IF EXISTS `cSettlement`;
CREATE TABLE `cSettlement` (
  `open_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `avatarUrl` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `win_cnt` int(11) NOT NULL DEFAULT 0,
  `weekly_win_cnt` int(11) NOT NULL DEFAULT 0,
  `monthly_win_cnt` int(11) NOT NULL DEFAULT 0,
  `lose_cnt` int(11) NOT NULL DEFAULT 0,
  `latest_opponent_open_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latest_result` tinyint(4) NOT NULL DEFAULT 0,
  `score` int(11) NOT NULL DEFAULT 0,
  `latest_score_delta` int(11) NOT NULL DEFAULT 0,
  `latest_rating_delta` int(11) NOT NULL DEFAULT 0,
  `rating` int(11) NOT NULL DEFAULT 0,
  `coin` int(11) NOT NULL DEFAULT 0,
  `headFrames` varchar(255) NOT NULL DEFAULT '',
  `chesses` varchar(255) NOT NULL DEFAULT '',
  `boards` varchar(255) NOT NULL DEFAULT '',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`open_id`),
  KEY `openid` (`open_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='游戏用户信息';

SET FOREIGN_KEY_CHECKS = 1;
