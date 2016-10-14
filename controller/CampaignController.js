
	"use strict";

	const { DBUtil } 			= require("util/");
	const { WalletController } 	= require("controller/");

	class CampaignController {

		static create (name, description, header, goal, start, end, owner) {
			if(!name || !description || !goal || !start || !end || !owner)
				return Promise.reject("not all vals set");
			const data = {
				name: name.trim(),
				description,
				type: "campaign",
				data: {
					header,
					goal,
					start,
					end,
					owner
				}
			};
			return DBUtil.getCollection("entities").then(collection => collection.insertOne(data)).then(doc => doc.result.ok ? data : null);
		}

		static find (id) {
			return DBUtil.getCollection("entities")
				.then(collection => collection.findOne({ _id: DBUtil.to_id(id) }))
				.then(async campaign => Object.assign(campaign, {
					wallet: await WalletController.balance(campaign._id)
				}));
		}

		static delete (id) {
			return Promise.resolve()
				.then(() => DBUtil.getCollection("entities"))
				.then(collection => collection.delete({ _id: DBUtil.to_id(id) }))
				.then(() => DBUtil.getCollection("transactions"))
				.then(collection => collection.delete({ toID: DBUtil.to_id(id) }));
		}

		static donate (id, amount, owner) {
			if(amount > owner.balance)
				return Promise.reject("not enough money");

		}

	}

	module.exports = CampaignController;
