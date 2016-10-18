
	"use strict";

	const { ObjectID, MongoClient } = require("mongodb");
	const config = require("config/");

	const storage = {
		db: undefined
	};

	class DBUtil {

		static getConnection (field, db) {
			if(!storage[field])
				storage[field] = MongoClient.connect(`mongodb://${config.database.host}:${config.database.port}/${db}`).catch(e => delete storage[field]);
			return storage[field];
		}

		static getDB () {
			return DBUtil.getConnection("db", config.database.name);
		}

		static getCollection (collectionName) {
			return DBUtil.getDB().then(db => db.collection(config.database.prefix + collectionName));
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