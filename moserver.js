var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');


// insert to mongodb
const inertMember = function (db, callback) {
  var members = [{
      name: 'Steve',
      sex: 'male'
    },
    {
      name: 'Bill',
      sex: 'male'
    },
    {
      name: 'Judy',
      sex: 'female'
    }
  ];
  var database = db.db('mydb');
  var collection = database.collection('members');

  // 寫入資料
  collection.insertMany(members, function (err, result) {
    assert.equal(err, null);
    assert.equal(3, result.result.n);
    assert.equal(3, result.ops.length);
    console.log('Inserted 3 members into the collection');
    callback(result);
  });
};

// find members
const findMembers = function (db, callback) {
  // Get the documents collection
  var database = db.db('mydb');
  const collection = database.collection('members');
  // Find some documents
  collection.find({}).toArray(function (err, docs) {
    assert.equal(err, null);
    console.log('Found the following records');
    console.log(docs);
    callback(docs);
  });
};

// Connect to the db
MongoClient.connect('mongodb://localhost:27017', function (err, db) {
  if (err) throw err;
  var callbackFunction = function () {
    console.log('insert members success!');
  };
  // inertMember(db, callbackFunction);
  findMembers(db, callbackFunction);

  //Write database Insert/Update/Query code here..

  db.close(); //關閉連線
});

// get all chanel
// 取得 所有頻道
function getAllChanel() {}