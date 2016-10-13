
	"use strict";

	const { CRESTUtil } = require("util/");

	class CharacterController {

		static login (code) {
			return (async () => {
				let { accessToken } = await CRESTUtil.getTokens({ grant_type: "code", code });
				let { id, name } = await CRESTUtil.getInfo(accessToken);
				return { id, name };
			})();
		}

	}

	module.exports = CharacterController;
