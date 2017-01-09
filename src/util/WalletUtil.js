
	"use strict";

	const request 			= require("request");
	const { parseString } 	= require("xml2js");
	const { DBUtil } 		= require("util/");
	const http 				= require("http");

	const storage = {
		next: new Date(),
		heartbeat: undefined,
		server: undefined
	};

	class WalletUtil {

		static get_data () {
			return new Promise((resolve, reject) => {
				request(`${process.env.XML_URL}/Corp/WalletJournal.xml.aspx?rowCount=2500&keyID=${config.xml.keyID}&vCode=${config.xml.vCode}`, (error, response, body) => {
					if (!error && response.statusCode == 200) {
						parseString(body, async (parseError, result) => {
							if(parseError || !result.eveapi) {
								console.log(parseError || result);
								reject(parseError);
							} else {

								let d = new Date(result.eveapi.cachedUntil[0] + "Z");

								let obj = (result.eveapi.result[0].rowset[0].row || [])
									.map(({ $ }) => ({
										from_id: 	$.ownerID1 - 0,
										from_name: 	$.ownerName1,
										to_id: 		$.ownerID2 - 0,
										to_name: 	$.ownerName2,
										ref_id: 	$.refID - 0,
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

				storage.heartbeat = Date.now();

				if(!storage.server)
					storage.server = http.createServer((req, res) => {
						switch (req.url) {
							case "/ping":
								res.writeHead(200); break;
							case "/healthcheck":
								res.writeHead(storage.heartbeat > Date.now() - (60 * 60 * 1000) ? 200 : 500); break;
						}
						res.end();
					}).listen(parseInt(process.env.APP_PORT));

				let response = await WalletUtil.get_data();

				storage.next = new Date(response.headers.expires);

				const transactionCollection = await DBUtil.get_collection("transactions");
				const entityCollection = await DBUtil.get_collection("entities");

				await Promise.all(response.obj.map(async ({ from_id, from_name, to_id, to_name, ref_id, to_ref_id = ref_id, amount, reason, timestamp }) => {

					// create pay ins
					if(to_name == "ISKstarter") {
						await transactionCollection.update({ ref_id }, { $set: {
							ref_id,
							from_name: 		"EVE System",
							from_id: 		1,
							to_name: 		from_name,
							to_id: 			from_id,
							amount,
							reason: 		"[payin]",
							timestamp
						} }, { upsert: true });
					}

					let entity;
					try {
						entity = await entityCollection.findOne({ _id: DBUtil.to_id(reason) });
					} catch (e) {}

					// convert pay ins to donations
					if(to_name == "ISKstarter" && entity && entity.data.start < timestamp && entity.data.end > timestamp) {
						await transactionCollection.update({ to_ref_id }, { $set: {
							to_ref_id,
							from_name,
							from_id,
							to_name: 		entity.name,
							to_id: 			entity._id,
							amount,
							reason: 		"[donation]",
							timestamp
						} }, { upsert: true });
					}

					// create pay outs
					if(from_name == "ISKstarter" && entity) {
						await transactionCollection.update({ ref_id }, { $set: {
							ref_id,
							from_name: 		entity.name,
							from_id: 		entity._id,
							to_name: 		"EVE System",
							to_id: 			1,
							reason: 		"[payout]",
							timestamp
						}, $setOnInsert: {
							amount:			-(amount / ((100 - parseFloat(process.env.TAX)) / 100)) // set on insert only if we change the tax rate at some point, also negate
						} }, { upsert: true });
					}

				}));

				storage.heartbeat = Date.now();

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
