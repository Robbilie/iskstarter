
	"use strict";

	const request 			= require("request");
	const { parseString } 	= require("xml2js");

	const config 			= require("config/");
	const { DBUtil } 		= require("util/");

	class WalletUtil {

		static loadUpdates () {
			request(`${config.ccp.api.url}/Corp/WalletJournal.xml.aspx?keyID=${config.ccp.keyID}&vCode=${config.ccp.vCode}`, (error, response, body) => {
				if (!error && response.statusCode == 200) {
					parseString(body, (parseError, result) => {
						if(parseError || !result.eveapi) {
							console.log(parseError || result);
							return setTimeout(() => WalletUtil.startUpdater(), 5 * 1000);
						} else {
							let d = new Date(result.eveapi.cachedUntil[0] + "Z");
							let e = new Date(result.eveapi.currentTime[0] + "Z");
							if(!result.eveapi.error) {
								console.log(JSON.stringify(result.eveapi.result[0].rowset[0].row || []));
							} else {
								console.log(result.eveapi.error);
							}
							setTimeout(() => WalletUtil.startUpdater(), Math.max(d.getTime() - e.getTime(), 0));
						}
					});
				} else {
					console.log(error || response.statusCode || response);
					return setTimeout(() => WalletUtil.startUpdater(), 5 * 1000);
				}
			});
		}

		static startUpdater () {
			WalletUtil.loadUpdates();
		}

	}

	module.exports = WalletUtil;
