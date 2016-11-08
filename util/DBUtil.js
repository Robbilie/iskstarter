
	"use strict";

	const { ObjectID, MongoClient } = require("mongodb");

	const storage = {
		db: undefined
	};

	class DBUtil {

		static getConnection (field, db) {
			if(!storage[field])
				storage[field] = MongoClient.connect(`${process.env.MONGO_URL}/${db}`).catch(e => delete storage[field]);
			return storage[field];
		}

		static getDB () {
			return DBUtil.getConnection("db", process.env.MONGO_DB);
		}

		static getCollection (collectionName) {
			return DBUtil.getDB().then(db => db.collection(collectionName));
		}

		static to_id (id) {
			return id.constructor.name == "String" ? new ObjectID(id) : id;
		}

	}

	process.on("SIGINT", () => {
		if(storage.db)
			storage.db.close();
	});

	module.exports = DBUtil;