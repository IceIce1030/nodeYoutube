const channelTitle = '同居時代 Co-Living'; // 關鍵字搜尋 keyword 同居時代 Co-Living || 木曜4超玩
const count = 50; // 數量(1-50) 每次api回來資料數量
var saveDatePath = 'searchData/'; // save json path
const channelId = 'UCQs0BeBhkbUN8K_J-vf6R3Q';
const searchChannel = {
  channelTitle: '同居時代 Co-Living',
  channelId: 'UCQs0BeBhkbUN8K_J-vf6R3Q',
}
const searchChannel_1 = {
  channelTitle: '木曜4超玩',
  channelId: 'UCLW_SzI9txZvtOFTPDswxqg',
}
const channels = {
  '同居時代 Co-Living': 'UCQs0BeBhkbUN8K_J-vf6R3Q',
  '木曜4超玩': 'UCLW_SzI9txZvtOFTPDswxqg'
}

module.exports = {
  channelTitle,
  count,
  saveDatePath,
  channelId,
  searchChannel
};