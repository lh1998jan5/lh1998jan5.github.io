/* =========================================================
   holidays.config.js — 本地配置（唯一配置文件）
   ---------------------------------------------------------
   这个文件同时保存「假期修正 / 自定义提醒」和「背景图名单 / 背景轮换设置」。

   页面的「假期设置」改完点「保存到文件」，会生成同样格式的
   文件；选中项目里的本文件覆盖即可，背景名单也会一起写进去。

   下面几个字段都可以只写一部分，没写的继续用内置数据 / 默认值：

   years    修正内置节日：{ 年份: [{ name, start, days }] }
            name  元旦 / 春节 / 清明 / 劳动节 / 端午 / 中秋 / 国庆
            start 假期首日 YYYY-MM-DD
            days  放假天数（含首日）

   hidden   不想在倒计时里出现的节日名，比如 ['元旦']

   custom   自定义提醒（团建、生日、旅行……）
            { id, name, start, days, yearly }
            yearly: true 表示每年重复（只取 start 的月日）

   backgrounds  背景图名单（照片放在 backgrounds/ 目录）
            一行一个，区分大小写；写文件名或 backgrounds/xxx 都可以。
            留空数组时，页面会尝试 bg-1.jpg … bg-6.jpg 这些默认命名。

   background   背景轮换
            mode   'minute' | 'hour' | 'day' | 'fixed'
            every  间隔数量（1–999）
            fixed  固定模式下使用的图片，如 'backgrounds/DSC07531.JPG'

   示例：
     "years": {"2027":[{"name":"元旦","start":"2027-01-01","days":3},{"name":"劳动节","start":"2027-05-01","days":4}]},
     "hidden": ["元旦"],
     "custom": [{"id":"c1","name":"小满生日","start":"2027-05-21","days":1,"yearly":true}],
     "backgrounds": ["DSC07531.JPG", "DSC09069.JPG", "DSC09072.JPG"],
     "background": {"mode":"minute", "every":1, "fixed":"backgrounds/DSC07531.JPG"}
   ========================================================= */
window.HOLIDAY_CONFIG = {
  "updatedAt": null,
  "years": {
    "2027": [
      {
        "name": "元旦",
        "start": "2027-01-01",
        "days": 3
      },
      {
        "name": "春节",
        "start": "2027-02-05",
        "days": 9
      },
      {
        "name": "清明",
        "start": "2027-04-03",
        "days": 3
      },
      {
        "name": "劳动节",
        "start": "2027-05-01",
        "days": 4
      },
      {
        "name": "端午",
        "start": "2027-06-09",
        "days": 1
      },
      {
        "name": "中秋",
        "start": "2027-09-15",
        "days": 1
      }
    ]
  },
  "hidden": [],
  "custom": [],
  "backgrounds": [
    "DSC07531.JPG",
    "DSC07536.JPG",
    "DSC07578.JPG",
    "DSC07607.JPG",
    "DSC08074.JPG",
    "DSC08075.JPG",
    "DSC08558.JPG",
    "DSC08567.JPG",
    "DSC08983.JPG",
    "DSC09031.JPG",
    "DSC09069.JPG",
    "DSC09072.JPG"
  ],
  "background": {
    "mode": "minute",
    "every": 1,
  }
};