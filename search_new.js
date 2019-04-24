var fs = require('fs');
var readline = require('readline');
const {
  google
} = require('googleapis');
const {
  OAuth2Client
} = require('google-auth-library');

// ----
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
// ----

var oauth2Data = '';
var client_content = '';
var nexPageToken = ''; //  yt nextPage token
// common variable
var {
  channelTitle,
  count,
  channelId,
  saveDatePath,
  searchChannel
} = require('./config');
// MongoDB function
var MongoDB = require('./MongoDB');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/google-apis-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
var TOKEN_DIR =
  (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
  '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'google-apis-nodejs-quickstart1.json';

// Load client secrets from a local file. [client_secret.json , client_secret1.json]
fs.readFile('client_secret1.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }

  var obj = {
    keyword: searchChannel.channelTitle,
    content
  };
  client_content = content;
  // temp mark
  searchVideos(obj);
  setInterval(() => {
    searchVideos(obj);
  }, 20000);
  // 測試 非同步連線 mongoDB
  // mongoTestConnect();
});

// { findData, collectionName, callback }
async function mongoTestConnect() {
  var m = new MongoDB();
  var obj = {
    findData: {},
    collectionName: 'videos',
    callback: function (doc) {
      console.log('find callback, doc is =>', doc);
    }
  };
  await m.findDocuments(obj);
  m.closeDB();
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, requestData, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);
  if (oauth2Data === '') {
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
      if (err) {
        getNewToken(oauth2Client, requestData, callback);
      } else {
        oauth2Client.credentials = JSON.parse(token);
        callback(oauth2Client, requestData);
      }
      oauth2Data = oauth2Client;
    });
  } else {
    callback(oauth2Data, requestData);
  }
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, requestData, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function (code) {
    rl.close();
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client, requestData);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), function (err, data) {
    if (err) throw err;
    console.log(data);
  });
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Remove parameters that do not have values.
 *
 * @param {Object} params A list of key-value pairs representing request
 *                        parameters and their values.
 * @return {Object} The params object minus parameters with no values set.
 */
function removeEmptyParameters(params) {
  for (var p in params) {
    if (!params[p] || params[p] == 'undefined') {
      delete params[p];
    }
  }
  return params;
}

/**
 * Create a JSON object, representing an API resource, from a list of
 * properties and their values.
 *
 * @param {Object} properties A list of key-value pairs representing resource
 *                            properties and their values.
 * @return {Object} A JSON object. The function nests properties based on
 *                  periods (.) in property names.
 */
function createResource(properties) {
  var resource = {};
  var normalizedProps = properties;
  for (var p in properties) {
    var value = properties[p];
    if (p && p.substr(-2, 2) == '[]') {
      var adjustedName = p.replace('[]', '');
      if (value) {
        normalizedProps[adjustedName] = value.split(',');
      }
      delete normalizedProps[p];
    }
  }
  for (var p in normalizedProps) {
    // Leave properties that don't have values out of inserted resource.
    if (normalizedProps.hasOwnProperty(p) && normalizedProps[p]) {
      var propArray = p.split('.');
      var ref = resource;
      for (var pa = 0; pa < propArray.length; pa++) {
        var key = propArray[pa];
        if (pa == propArray.length - 1) {
          ref[key] = normalizedProps[p];
        } else {
          ref = ref[key] = ref[key] || {};
        }
      }
    }
  }
  return resource;
}

function searchListByKeyword(auth, requestData) {
  var service = google.youtube('v3');
  var parameters = removeEmptyParameters(requestData['params']);
  parameters['auth'] = auth;
  service.search.list(parameters, function (err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var dateAlbum = response.data.items;
  });
}

// 從 yt data api 取得 videos
function searchVideos(option) {
  var keyword = option.keyword;
  // var callback = option.callback;
  var callback = function (auth, requestData) {
    var service = google.youtube('v3');
    var parameters = removeEmptyParameters(requestData['params']);
    parameters['auth'] = auth;
    service.search.list(parameters, function (err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      // console.log('response=>', response);
      if (nexPageToken == '') {
        // 紀錄 record]
        const firstVideo = response.data.items[0];
        let record = {
          channelId: firstVideo.snippet.channelId,
          channelTitle: firstVideo.snippet.channelTitle,
          videoId: firstVideo.id.videoId,
          publishedAt: firstVideo.snippet.publishedAt,
        };
        checkRecord(record);
      }
      return false;
      nexPageToken = response.data.nextPageToken ?
        response.data.nextPageToken :
        '';
      var channelData = '';
      var resData = response.data;
      var videos = [];
      resData.items.forEach(item => {
        if (item.snippet.channelTitle === searchChannel.channelTitle) {
          if (channelData === '') {
            // 處理頻道 table
            channelData = {
              channelId: item.snippet.channelId,
              channelTitle: item.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt
            };
            channelHandler(channelData);
          }
          videos.push(item);
        }
      });
      var obj = {
        videos,
        channelId: channelData.channelId
      };
      var _callback = function (obj) {
        insertVideosToUniqueTable(obj);
      };
      insertVideos(obj, _callback);
    });
  };
  var content = option.content;
  var _requestData = {
    params: {
      maxResults: count,
      part: 'snippet',
      // q: keyword,
      channelId: searchChannel.channelId,
      type: 'video',
      order: 'date',
    }
  };
  if (option.pageToken) _requestData.params.pageToken = option.pageToken;
  authorize(JSON.parse(content), _requestData, callback);
}

// insert 新增頻道
/*
channelData = {
  channelId,
  channelTitle
  publishedAt,
}
*/
function insertChannel(channelData, callback) {
  // Connect to the db
  callback = callback || function () {};
  MongoClient.connect('mongodb://localhost:27017', function (err, db) {
    if (err) throw err;
    var database = db.db('mydb');
    const collection = database.collection('channels');
    var channels = [{
      channelId: channelData.channelId,
      channelTitle: channelData.channelTitle,
      publishedAt: channelData.publishedAt
    }];
    // 寫入資料
    collection.insertMany(channels, function (err, result) {
      assert.equal(err, null);
      assert.equal(channels.length, result.result.n);
      assert.equal(channels.length, result.ops.length);
      console.log(
        'Inserted ' + channels.length + ' channels into the collection(channels)'
      );
      callback(result);
    });
    db.close(); //關閉連線\

  });
}
// 檢查使否有新增過頻道，將頻道資訊新增 mongodb
function channelHandler(channelData) {
  // Connect to the db
  MongoClient.connect('mongodb://localhost:27017', function (err, db) {
    if (err) throw err;
    var callbackFunction = function (res) {
      if (res.length === 0) {
        // 新增
        insertChannel(channelData);
      } else {
        console.log('channel is exist');
      }
    };
    // inertMember(db, callbackFunction);
    var obj = {
      db,
      channelData,
      callback: callbackFunction
    };
    findChannel(obj);
    //Write database Insert/Update/Query code here..
  });
}
// find channel
const findChannel = function ({
  db,
  channelData,
  callback
}) {
  // Get the documents collection
  var database = db.db('mydb');
  const collection = database.collection('channels');
  // Find some documents
  collection
    .find({
      channelId: channelData.channelId
    })
    .toArray(function (err, docs) {
      assert.equal(err, null);
      // console.log(docs);
      db.close(); //關閉連線
      callback(docs);
    });
};

// insert videos to totalTable
/*
  option.videos (array)
  option.channelId (string)
*/
function insertVideos(option, callback) {
  var ch_id = option.channelId;
  var vds = option.videos;
  // Connect to the db
  callback = callback || function () {};
  if (vds.length > 0) {
    MongoClient.connect('mongodb://localhost:27017', function (err, db) {
      if (err) throw err;
      var database = db.db('mydb');
      const collection = database.collection('videos');
      var videos = vds.map(video => {
        var re = {
          channelId: video.snippet.channelId,
          channelName: video.snippet.channelTitle,
          videoId: video.id.videoId,
          title: video.snippet.title,
          publishedAt: video.snippet.publishedAt,
          description: video.snippet.description,
          itemjson: JSON.stringify(video)
        };
        return re;
      });
      // console.log('videos=>', videos);

      // 寫入資料
      collection.insertMany(videos, function (err, result) {
        assert.equal(err, null);
        assert.equal(videos.length, result.result.n);
        assert.equal(videos.length, result.ops.length);
        console.log(
          'Inserted ' + videos.length + ' videos into the collection(video)'
        );
        callback(videos);
      });
      db.close(); //關閉連線
    });
  }
}



// insert unique table
function insertVideosToUniqueTable(data) {
  // Connect to the db
  MongoClient.connect('mongodb://localhost:27017', function (err, db) {
    if (err) throw err;
    var database = db.db('mydb');
    var tableName = data[0].channelId + '_videos';
    const collection = database.collection(tableName);
    // 寫入資料
    collection.insertMany(data, function (err, result) {
      assert.equal(err, null);
      assert.equal(data.length, result.result.n);
      assert.equal(data.length, result.ops.length);
      console.log(
        `Inserted ' ${data.length} ${tableName} into the collection(${data[0].channelId}_videos)`
      );
    });
    db.close(); //關閉連線
  });

  // 是否還有下一頁
  if (nexPageToken !== '') {
    // 還有資料
    var obj = {
      keyword: searchChannel.channelTitle,
      pageToken: nexPageToken,
      content: client_content
    };
    searchVideos(obj);
  } else {
    // 最後一頁
    nexPageToken = '';
  }
}
// 檢查 紀錄檔資料，檢查最新的影片，
function checkRecord(logData) {
  MongoClient.connect('mongodb://localhost:27017', {
    useNewUrlParser: true
  }, function (err, db) {
    if (err) throw err;
    var database = db.db('mydb');
    const collection = database.collection('record');
    // Find some documents
    // logData.videoId += '1234';
    collection
      .find({
        videoId: logData.videoId
      })
      .toArray(function (err, docs) {
        if (err) throw err;
        assert.equal(err, null);
        db.close(); //關閉連線
        if (docs.length === 0) {
          console.log(`Channel [${logData.channelTitle}] has new video, record log now!`);
          recordLog(logData);
        } else {
          console.log(`Channel [${logData.channelTitle}] don't has new video!(todo)`);
        }
        console.log('docs=>', docs);
      });
  });
}

// 新增 紀錄檔資料
function recordLog(logData, callback) {
  callback = callback || function () {};
  MongoClient.connect('mongodb://localhost:27017', {
    useNewUrlParser: true
  }, function (err, db) {
    if (err) throw err;
    var database = db.db('mydb');
    const collection = database.collection('record');
    var record = [{
      channelId: logData.channelId,
      channelTitle: logData.channelTitle,
      publishedAt: logData.publishedAt,
      videoId: logData.videoId,
      recordTime: new Date(),
    }];
    // 寫入資料
    collection.insertMany(record, function (err, result) {
      assert.equal(err, null);
      assert.equal(record.length, result.result.n);
      assert.equal(record.length, result.ops.length);
      console.log(
        'Inserted ' + record.length + ' record into the collection(record)'
      );
      callback(result);
    });
    // 寫入自己的table
    const uniq_collection = database.collection(`${logData.channelId}_record`);
    uniq_collection.drop(function (err, result) {
      assert.equal(err, null);
      if (result) console.log('drop collection complete!');
      // callback(result);
      (function () {
        uniq_collection.insertMany(record, function (err, result) {
          assert.equal(err, null);
          assert.equal(record.length, result.result.n);
          assert.equal(record.length, result.ops.length);
          console.log(
            `Inserted  ${record.length} record into the collection(${logData.channelId}_record})`
          );
        });
        db.close(); //關閉連線
      })()
    });

  });
}