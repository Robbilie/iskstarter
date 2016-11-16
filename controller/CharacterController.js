
	"use strict";

	const {
		CRESTUtil,
		DBUtil
	} = require("util/");

	class CharacterController {

		static async login (code) {
			let { accessToken } = await CRESTUtil.getTokens({ grant_type: "authorization_code", code });
			let { id, name } = await CRESTUtil.getInfo(accessToken);
			return { id, name };
		}

		static async isBanned ({ id }) {
			let roles = await DBUtil.getCollection("roles");
			let role = await roles.findOne({ "character.id": id, isBanned: true });
			return !!role;
		}

		static async isAdmin ({ id }) {
			let roles = await DBUtil.getCollection("roles");
			let role = await roles.findOne({ "character.id": id, isAdmin: true });
			return !!role;
		}

	}

	module.exports = CharacterController;
