
	"use strict";

	const { CRESTUtil } = require("util/");

	class CharacterController {

		static login (code) {
			return CRESTUtil.getTokens({ grant_type: "code", code })
				.then(data => console.log(data) || CRESTUtil.getInfo(data.accessToken))
				.then(({ id, name }) => ({ id, name }));
		}

	}

	module.exports = CharacterController;
