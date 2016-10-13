
	"use strict";

	const { CRESTUtil } = require("util/");

	class CharacterController {

		static login (code) {
			return Promise.resolve()
				.then(() => CRESTUtil.getTokens({ grant_type: "authorization_code", code }))
				.then(({ accessToken }) => CRESTUtil.getInfo(accessToken))
				.then(({ id, name }) => ({ id, name }));
		}

	}

	module.exports = CharacterController;
