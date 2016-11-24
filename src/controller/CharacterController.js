
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

		static async is_banned ({ id }) {
			let roles = await DBUtil.get_collection("roles");
			let role = await roles.findOne({ "character.id": id, is_banned: true });
			return !!role;
		}

		static async is_admin ({ id }) {
			let roles = await DBUtil.get_collection("roles");
			let role = await roles.findOne({ "character.id": id, is_admin: true });
			return !!role;
		}

	}

	module.exports = CharacterController;
