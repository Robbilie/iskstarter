
	"use strict";

	const request 			= require("request");
	const { parseString } 	= require("xml2js");

	const config 			= require("config/");
	const { DBUtil } 		= require("util/");

	class WalletUtil {

		static loadUpdates () {
			request(`${config.ccp.api.url}/Corp/WalletJournal.xml.aspx?keyID=${config.ccp.keyID}&vCode=${config.ccp.vCode}`, (error, response, body) => {
				if (!error && response.statusCode == 200) {
					parseString(body, async (parseError, result) => {
						if(parseError || !result.eveapi) {
							console.log(parseError || result);
							return setTimeout(() => WalletUtil.startUpdater(), 5 * 1000);
						} else {
							let d = new Date(result.eveapi.cachedUntil[0] + "Z");
							let e = new Date(result.eveapi.currentTime[0] + "Z");
							if(!result.eveapi.error) {

								let transactions = (result.eveapi.result[0].rowset[0].row || [])
									.filter(({ $ }) => $.ownerName2 == "ISKstarter")
									.map(({ $ }) => ({
										fromID: 	$.ownerID2 - 0,
										fromName: 	$.ownerName2,
										toID: 		$.ownerID1 - 0,
										toName: 	$.ownerName1,
										refID: 		$.refID - 0,
										amount: 	(($.amount - 0) * (100 - config.site.tax) | 0) / 100,
										reason: 	$.reason,
										timestamp: 	new Date($.date + "Z").getTime()
									}));

								const transactionCollection 	= await DBUtil.getCollection("transactions");
								const entityCollection 			= await DBUtil.getCollection("entities");

								await Promise.all(transactions.map(transaction => transactionCollection.update({ refID: transaction.refID }, { $setOnInsert: transaction }, { upsert: true })));

								await Promise.all(transactions.filter(transaction => transaction.reason != "").map(async (transaction) => {
									let entity = await entityCollection.findOne({ _id: DBUtil.to_id(transaction.reason) });
									if(entity) {
										await transactionCollection.update({ toRefID: transaction.refID }, { $setOnInsert: {
											fromID: 	transaction.toID,
											fromName: 	transaction.toName,
											toID: 		entity._id,
											toName: 	entity.name,
											toRefID: 	transaction.refID,
											amount: 	transaction.amount,
											reason: 	"[donation]",
											timestamp: 	transaction.timestamp
										} }, { upsert: true });
									}
								}));

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
