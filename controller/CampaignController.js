
	"use strict";

	const { DBUtil } 			= require("util/");
	const { WalletController } 	= require("controller/");
	const { ObjectID } 			= require("mongodb");

	class CampaignController {

		static create (name, description, header, goal, start, end, owner) {
			if(!name || !description || !goal || !start || !end || !owner)
				return Promise.reject("not all vals set");
			const data = {
				name: name.trim().replace(/script|SCRIPT|iframe|IFRAME|[\w]+="|[\w]+='/g, ""),
				description: description.replace(/script|SCRIPT|iframe|IFRAME|[\w]+="|[\w]+='/g, ""),
				type: "campaign",
				data: {
					header,
					goal,
					start,
					end,
					owner
				}
			};
			return DBUtil.getCollection("entities").then(collection => collection.insertOne(data)).then(doc => doc.result.ok ? data : Promise.reject("something went wrong"));
		}

		static find (id) {
			return DBUtil.getCollection("entities")
				.then(collection => collection.findOne({ _id: DBUtil.to_id(id), type: "campaign" }))
				.then(async campaign => Object.assign(campaign, {
					wallet: await WalletController.balance(campaign._id)
				}));
		}

		static page (page = 1, limit = 100) {
			return DBUtil.getCollection("entities")
				.then(collection => collection.find({ type: "campaign" }).skip(Math.max(page - 1, 0) * limit).limit(limit).toArray())
				.then(campaigns => Promise.all(campaigns.map(async campaign => Object.assign(campaign, {
					wallet: await WalletController.balance(campaign._id)
				}))));
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
			return DBUtil.getCollection("entities")
				.then(collection => collection.findOne({
					_id: DBUtil.to_id(id),
					"data.start": { $lt: Date.now() },
					"data.end": { $gt: Date.now() }
				}))
				.then(entity => entity ? entity : Promise.reject("no such entity"))
				.then(async entity => {
					let collection = await DBUtil.getCollection("transactions");
					let data = {
						fromID: 	owner.id,
						fromName: 	owner.name,
						toID: 		entity._id,
						toName: 	entity.name,
						refID: 		new ObjectID(),
						amount: 	amount,
						reason: 	"[donation]",
						timestamp: 	Date.now()
					};
					let doc = await collection.insert(data);
					if(doc.result.ok) {
						let balance = await WalletController.balance(owner.id)
						if(balance < 0) {
							await collection.delete({ _id: data._id });
							throw new Error("not enough money");
						}
					} else {
						throw new Error("Something went wrong");
					}
				});
		}

	}

	module.exports = CampaignController;
