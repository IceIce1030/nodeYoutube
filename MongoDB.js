 var MongoClient = require('mongodb').MongoClient;
 var assert = require('assert');
 var MongoDB = function () {
   var database = '';
   const url = 'mongodb://localhost:27017'; // Connection URL
   var dbName = 'mydb'; // Database Name
   var _this = this;
   // db option
   // 連線db
   this.connectDB = function (_callbackFunc) {
     if (database === '') {
       MongoClient.connect(url, function (err, db) {
         if (err) throw err;
         database = db;
         _callbackFunc();
         console.log('mongoDB connect success!');
       });
     } else {
       _callbackFunc();
       console.log('mongoDB is connected!');
     }
   };
   // 關閉連線
   this.closeDB = function () {
     database.close();
     console.log('mongoDB connect end!');
   };
   // creat
   this.insertDocument = function ({
     insertData,
     collectionName,
     callback
   }) {
     const collection = database.collection(collectionName);
     // 寫入資料
     collection.insertMany(insertData, function (err, result) {
       assert.equal(err, null);
       assert.equal(insertData.length, result.result.n);
       assert.equal(insertData.length, result.ops.length);
       console.log(
         `Inserted ${insertData.length} ${collectionName} into the collection!`
       );
       callback(result);
     });
   };
   // read
   this.findDocuments = function ({
     findData,
     collectionName,
     callback
   }) {
     var findFunc = function () {
       const collection = database.db(dbName).collection(collectionName);
       collection.find(findData).toArray(function (err, docs) {
         assert.equal(err, null);
         // console.log(docs);
         callback(docs);
       });
     };
     _this.connectDB(findFunc);
     return new Promise(function (resolve, reject) {
       setTimeout(() => resolve(), 1000);
     });
   };
   // update (todo)
   this.updateDocument = function ({
     updateData,
     collectionName,
     callback
   }) {
     const collection = database.db(dbName).collection(collectionName);
     callback();
   };
   // delete (todo)
   this.removeDocument = function ({
     removeData,
     collectionName,
     callback
   }) {
     const collection = database.db(dbName).collection(collectionName);
     callback();
   };
 }
 module.exports = MongoDB;