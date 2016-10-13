
	"use strict";

	const request 		= require("request");
	const xml2js 		= require("xml2js");

	const { DBUtil } 	= require("util/");

	class WalletUtil {

		static loadUpdates () {
			request(``, async () => {

			});
		}

		static startUpdater () {
			WalletUtil.loadUpdates();
		}

	}

	module.exports = WalletUtil;
