
	"use strict";

	const { DBUtil } = require("util/");

	class CampaignController {

		static create (name, description, goal, start, end, owner) {
			if(!name || !description || !goal || !start || !end || !owner)
				return Promise.reject("not all vals set");
			return DBUtil.getCollection("entities").then(collection => collection.insert({
				name: name.trim(),
				description,
				type: "campaign",
				data: {
					goal,
					start,
					end
				}
			}));
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
