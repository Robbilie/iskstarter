
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
			let data = CampaignController.sanitize(name, description, owner, header, goal, start, end);

			if(await CharacterController.is_banned(owner))
				throw "You are banned from creating new campaigns";
			if(await CampaignController.count_by_owner(owner) >= 6)
				throw "You already have 6 running campaigns";

			let entities = await DBUtil.get_collection("entities");
			let doc = await entities.insertOne(data);
			if(!doc.result.ok)
				throw "something went wrong";

			return data;
		}

		static update (_id, name, description, owner, header, goal, start, end, user) {
			return super.update(_id, CampaignController.sanitize(name, description, owner, header, goal, start, end), { is_admin: user });
		}

		static sanitize (name, description, owner, header, goal, start, end) {
			let res = super.sanitize("campaign", name, description, owner);

			if(
				!header ||
				header.trim() == "" ||
				!goal ||
				goal == 0 ||
				Number.isNaN(goal) ||
				!start ||
				Number.isNaN(start) ||
				!end ||
				Number.isNaN(end)
			)
				throw "not all fields set";

			return Object.assign(res, {
				data: {
					header,
					goal,
					start,
					end
				}
			});
		}

		static approve (_id, user) {
			return super.update(_id, { approved: true }, { is_admin: user });
		}

		static reject (_id, description, user) {
			return super.update(_id, { reject: { description, user, timestamp: Date.now() } }, { is_admin: user });
		}

		static rejected (options, config) {
			return this.find(
				Object.assign({ rejected: { $exists: true } }, options),
				Object.assign({ sort: { "rejected.timestamp": -1 } }, config)
			);
		}

		static unapproved (options, config, user) {
			return this.find(
				Object.assign({ rejected: { $exists: false }, approved: { $exists: false} }, options),
				Object.assign({ is_admin: user, sort: { "data.start": 1 } }, config)
			);
		}

		static async page (options = {}, config = {}) {
			let campaigns = await this.find(
				Object.assign({ approved: true }, options),
				config
			);
			return await WalletController.assign_balance(campaigns);
		}

		static async findOne (_id) {
			let campaign = await super.findOne(_id, "campaign");

			let io = await WalletController.in_and_out(campaign._id);

			return Object.assign(campaign, {
				wallet: io.wallet_in,
				payout: io.wallet_out
			});
		}

		static find (options, config) {
			return super.find("campaign", options, config);
		}

		static async donate (_id, amount, owner) {
			if(amount == 0)
				return;
			if(Number.isNaN(amount))
				throw "something went wrong";
			if(amount > owner.balance)
				throw "not enough money";

			const now = Date.now();

			let entities = await DBUtil.get_collection("entities");
			let entity = await entities.findOne({
				_id,
				"data.start": { $lt: now },
				"data.end": { $gt: now }
			});
			if(!entity)
				throw "no such entity";

			let transactions = await DBUtil.get_collection("transactions");
			let data = {
				from_id: 	owner.id,
				from_name: 	owner.name,
				to_id: 		entity._id,
				to_name: 	entity.name,
				ref_id: 	new ObjectID(),
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