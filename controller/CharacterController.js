
	"use strict";

	const {
		CRESTUtil,
		DBUtil
	} = require("util/");

	class CharacterController {

		static login (code) {
			return Promise.resolve()
				.then(() => CRESTUtil.getTokens({ grant_type: "authorization_code", code }))
				.then(({ accessToken }) => CRESTUtil.getInfo(accessToken))
				.then(({ id, name }) => ({ id, name }));
		}

		static isBanned ({ id }) {
			return DBUtil.getCollection("roles")
				.then(collection => collection.findOne({ "character.id": id, isBanned: true }))
				.then(role => !!role);
		}

		static isAdmin ({ id }) {
			return DBUtil.getCollection("roles")
				.then(collection => collection.findOne({ "character.id": id, isAdmin: true }))
				.then(role => !!role);
		}

	}

	module.exports = CharacterController;
