
	"use strict";

	const { DBUtil } 			= require("util/");
	const { WalletController } 	= require("controller/");

	class CampaignController {

		static create (name, description, goal, start, end, owner) {
			if(!name || !description || !goal || !start || !end || !owner)
				return Promise.reject("not all vals set");
			const data = {
				name: name.trim(),
				description,
				type: "campaign",
				data: {
					goal,
					start,
					end
				}
			};
			return DBUtil.getCollection("entities").then(collection => collection.insertOne(data)).then(doc => doc.result.ok ? data : null);
		}

		static find (id) {
			return DBUtil.getCollection("entities")
				.then(collection => collection.findOne({ _id: DBUtil.to_id(id) }))
				.then(async campaign => Object.assign(campaign, {
					wallet: await WalletController.balance(DBUtil.to_id(req.params.id))
				}));
		}

	}

	module.exports = CampaignController;
