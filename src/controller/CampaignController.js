
	"use strict";

	const { DBUtil } 			= require("util/");
	const {
		EntityController,
		WalletController,
		CharacterController
	} 	= require("controller/");
	const { ObjectID } 			= require("mongodb");

	class CampaignController extends EntityController {

		static async create (name, description, header, goal, start, end, owner) {
			const data = CampaignController.sanitize(name, description, header, goal, start, end, owner);

			if(await CharacterController.is_banned(owner))
				throw "You are banned from creating new campaigns";
			if(await CampaignController.countByOwner(owner) >= 6)
				throw "You already have 6 running campaigns";

			let entities = await DBUtil.get_collection("entities");
			let doc = await entities.insertOne(data);
			if(!doc.result.ok)
				throw "something went wrong";

			return data;
		}

		static async update (_id, name, description, header, goal, start, end, owner, user) {
			const data = CampaignController.sanitize(name, description, header, goal, start, end, owner);

			if(await CharacterController.is_admin(user) == false)
				throw "You are not an admin";

			let entities = await DBUtil.get_collection("entities");
			return await entities.update({ _id }, { $set: data });
		}

		static sanitize (name, description, header, goal, start, end, owner) {
			if(
				!name ||
				name.trim() == "" ||
				!description ||
				description.trim() == "" ||
				!header ||
				header.trim() == "" ||
				!goal ||
				goal == 0 ||
				Number.isNaN(goal) ||
				!start ||
				Number.isNaN(start) ||
				!end ||
				Number.isNaN(end) ||
				!owner
			)
				throw "not all fields set";
			return {
				name: name.trim().replace(/script|SCRIPT|iframe|IFRAME|[\w]+="|[\w]+='/g, ""),
				description: description.replace(/script|SCRIPT|iframe|IFRAME|[\w]+="|[\w]+='/g, ""),
				type: "campaign",
				data: {
					header,
					goal,
					start,
					end,
					owner: {
						id: 	owner.id,
						name: 	owner.name
					}
				}
			};
		}

		static async approve (id, user) {
			if(await CharacterController.is_admin(user) == false)
				throw "You are not an admin";

			let entities = await DBUtil.get_collection("entities");
			return await entities.update({ _id: DBUtil.to_id(id) }, { $set: { approved: true } });
		}

		static async reject (id, description, user) {
			if(await CharacterController.is_admin(user) == false)
				throw "You are not an admin";

			let entities = await DBUtil.get_collection("entities");
			return await entities.update({ _id: DBUtil.to_id(id) }, { $set: { rejected: { description, user, timestamp: Date.now() } } });
		}

		static async rejected (options = {}, page = 1, limit = 100) {
			let entities = await DBUtil.get_collection("entities");
			return await entities.find(Object.assign({ type: "campaign", rejected: { $exists: true } }, options)).sort({ "rejected.timestamp": -1 }).skip(Math.max(page - 1, 0) * limit).limit(limit).toArray();
		}

		static async unapproved (user, options = {}, page = 1, limit = 100) {
			if(await CharacterController.is_admin(user) == false)
				throw "You are not an admin";

			let entities = await DBUtil.get_collection("entities");
			return await entities.find(Object.assign({ type: "campaign", rejected: { $exists: false }, approved: { $exists: false} }, options)).sort({ "data.start": 1 }).skip(Math.max(page - 1, 0) * limit).limit(limit).toArray();
		}

		static async find (id) {
			let entities = await DBUtil.get_collection("entities");

			let campaign = await entities.findOne({ _id: DBUtil.to_id(id), type: "campaign" });
			if(!campaign)
				throw "Invalid campaign id";

			let io = await WalletController.in_and_out(campaign._id);

			return Object.assign(campaign, {
				wallet: io.walletIn,
				payout: io.walletOut
			});
		}

		static async findByOwner ({ id }) {
			let entities = await DBUtil.get_collection("entities");
			return await entities.find({ "data.owner.id": id }).toArray();
		}

		static async countByOwner ({ id}) {
			let entities = await DBUtil.get_collection("entities");
			return await entities.find({ "data.owner.id": id, approved: true, "data.end": { $gt: Date.now() } }).count();
		}

		static async page (options = {}, page = 1, limit = 100) {
			let entities = await DBUtil.get_collection("entities");
			let campaigns = await entities.find(Object.assign({ type: "campaign", approved: true }, options)).sort({ "data.end": 1 }).skip(Math.max(page - 1, 0) * limit).limit(limit).toArray();

			return await Promise.all(campaigns.map(async campaign => Object.assign(campaign, {
				wallet: await WalletController.balance(campaign._id)
			})));
		}

		static async remove (id) {
			let entities = await DBUtil.get_collection("entities");
			await entities.remove({ _id: DBUtil.to_id(id) });

			let transactions = await DBUtil.get_collection("transactions");
			await transactions.remove({ toID: DBUtil.to_id(id) });
		}

		static async donate (id, amount, owner) {
			if(amount == 0)
				return;
			if(Number.isNaN(amount))
				throw "something went wrong";
			if(amount > owner.balance)
				throw "not enough money";

			const now = Date.now();

			let entities = await DBUtil.get_collection("entities");
			let entity = await entities.findOne({
				_id: DBUtil.to_id(id),
				"data.start": { $lt: now },
				"data.end": { $gt: now }
			});
			if(!entity)
				throw "no such entity";

			let transactions = await DBUtil.get_collection("transactions");
			let data = {
				fromID: 	owner.id,
				fromName: 	owner.name,
				toID: 		entity._id,
				toName: 	entity.name,
				refID: 		new ObjectID(),
				amount: 	amount,
				reason: 	"[donation]",
				timestamp: 	now
			};
			let doc = await transactions.insert(data);
			if(!doc.result.ok)
				throw "Something went wrong";

			let balance = await WalletController.balance(owner.id);
			if(balance < 0) {
				await collection.remove({ _id: data._id });
				throw "not enough money";
			}
		}

	}

	module.exports = CampaignController;
