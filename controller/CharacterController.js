
	"use strict";

	const { CRESTUtil } = require("util/");

	class CharacterController {

		static login (code) {
			return CRESTUtil.getTokens({ grant_type: "code", code }).then(({ accessToken }) => CRESTUtil.getInfo(accessToken)).then(({ id, name}) => ({ id, name }));
		}

	}

	module.exports = CharacterController;
