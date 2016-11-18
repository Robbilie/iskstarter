
	"use strict";

	const request 			= require("request");
	const { parseString } 	= require("xml2js");
	const { DBUtil } 		= require("util/");

	const storage = {
		next: new Date()
	};

	class WalletUtil {

		static get_data () {
			return new Promise((resolve, reject) => {
				request(`${process.env.XML_URL}/Corp/WalletJournal.xml.aspx?keyID=${config.xml.keyID}&vCode=${config.xml.vCode}`, (error, response, body) => {
					if (!error && response.statusCode == 200) {
						parseString(body, async (parseError, result) => {
							if(parseError || !result.eveapi) {
								console.log(parseError || result);
								reject(parseError);
							} else {

								let d = new Date(result.eveapi.cachedUntil[0] + "Z");

								let obj = (result.eveapi.result[0].rowset[0].row || [])
									.map(({ $ }) => ({
										fromID: 	$.ownerID1 - 0,
										fromName: 	$.ownerName1,
										toID: 		$.ownerID2 - 0,
										toName: 	$.ownerName2,
										refID: 		$.refID - 0,
										amount: 	$.amount - 0,
										reason: 	$.reason.replace("DESC:", "").trim(),
										timestamp: 	new Date($.date + "Z").getTime()
									}));

								resolve({
									headers: {
										expires: d.toString()
									},
									obj
								});
							}
						});
					} else {
						console.log(error || response.statusCode || response);
						reject(error);
					}
				});
			});
		}

		static async load_next () {
			try {

				let response = await WalletUtil.get_data();

				storage.next = new Date(response.headers.expires);

				setTimeout(() => WalletUtil.load_next(), new Date(response.headers.expires).getTime() - Date.now());

			} catch (e) {
				console.log(e);
				setTimeout(() => WalletUtil.load_next(), 5 * 1000);
			}
		}

		static async load_updates () {
			try {

				let response = await WalletUtil.get_data();

				storage.next = new Date(response.headers.expires);

				const transactionCollection = await DBUtil.getCollection("transactions");
				const entityCollection = await DBUtil.getCollection("entities");

				await Promise.all(response.obj.map(async transaction => {

					// create pay ins
					if(transaction.toName == "ISKstarter") {
						await transactionCollection.update( { refID: transaction.refID }, { $setOnInsert: {
							refID: 			transaction.refID,
							fromName: 		"EVE System",
							fromID: 		1,
							toName: 		transaction.fromName,
							toID: 			transaction.toID,
							amount: 		Math.floor((transaction.amount - 0) * (100 - parseFloat(process.env.TAX))) / 100,
							reason: 		"[payin]",
							timestamp: 		transaction.timestamp
						} }, { upsert: true });
					}

					let entity = await entityCollection.findOne({ _id: DBUtil.to_id(transaction.reason) });

					// convert pay ins to donations
					if(transaction.toName == "ISKstarter" && entity && entity.data.start < transaction.timestamp && entity.data.end > transaction.timestamp) {
						await transactionCollection.update( { toRefID: transaction.refID }, { $setOnInsert: {
							toRefID: 		transaction.refID,
							fromName: 		transaction.fromName,
							fromID: 		transaction.fromID,
							toName: 		entity.name,
							toID: 			entity._id,
							amount: 		Math.floor((transaction.amount - 0) * (100 - parseFloat(process.env.TAX))) / 100,
							reason: 		"[donation]",
							timestamp: 		transaction.timestamp
						} }, { upsert: true });
					}

					// create pay outs
					if(transaction.fromName == "ISKstarter" && entity) {
						await transactionCollection.update({ refID: transaction.refID }, { $setOnInsert: {
							refID: 			transaction.refID,
							fromName: 		entity.name,
							fromID: 		entity._id,
							toName: 		"EVE System",
							toID: 			1,
							amount: 		transaction.amount,
							reason: 		"[payout]",
							timestamp: 		transaction.timestamp
						} }, { upsert: true });
					}

				}));

				setTimeout(() => WalletUtil.load_updates(), new Date(response.headers.expires).getTime() - Date.now());

			} catch (e) {
				console.log(e);
				setTimeout(() => WalletUtil.load_updates(), 5 * 1000);
			}
		}

		static next () {
			return Promise.resolve(storage.next);
		}

	}

	module.exports = WalletUtil;
