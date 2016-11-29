
	"use strict";

	const { ObjectID, MongoClient } = require("mongodb");

	const storage = {
		db: undefined
	};

	class DBUtil {

		static get_connection (field, db) {
			if(!storage[field])
				storage[field] = MongoClient.connect(`${process.env.MONGO_URL}/${db}`).catch(e => !(delete storage[field]) || get_connection(field, db));
			return storage[field];
		}

		static get_db () {
			return DBUtil.get_connection("db", process.env.MONGO_DB);
		}

		static get_collection (collectionName) {
			return DBUtil.get_db().then(db => db.collection(collectionName));
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