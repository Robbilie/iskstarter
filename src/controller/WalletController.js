
	"use strict";

	const { DBUtil } = require("util/");

	class WalletController {

		static async all (options = {}, { sort = { timestamp: -1 }, page = 1, limit = 100 } = {}) {
			let transactions = await DBUtil.get_collection("transactions");
			return await transactions
				.find(options)
				.sort(sort)
				.skip(Math.max(page - 1, 0) * limit)
				.limit(limit)
				.toArray();
			/*
			return DBUtil.getCollection("transactions")
				.then(collection =>
					collection.aggregate([
						{ $match: {} },
						{ $project: {
							transaction: [
								{
									id: "$to_name",
									amount: "$amount"
								},
								{
									id: "$from_name",
									amount: { $subtract: [0, "$amount"] }
								}
							]
						} },
						{ $unwind: {
							path: "$transaction"
						} },
						{ $project: {
							id: "$transaction.id",
							amount: "$transaction.amount"
						} },
						{ $group: {
							_id: "$id",
							amount: { $sum: "$amount" }
						} }
					]).toArray()
				);
				*/
		}

		static async transactions (id, options = {}, { sort = { timestamp: -1 }, page = 1, limit = 50 } = {}) {
			let transactions = await DBUtil.get_collection("transactions");
			return await transactions
				.find(Object.assign({ $or: [{ from_id: id }, { to_id: id }] }, options))
				.sort(sort)
				.skip(Math.max(page - 1, 0) * limit)
				.limit(limit)
				.toArray();
		}

		static async in_and_out (id) {
			let transactions = await DBUtil.get_collection("transactions");
			let entries = await transactions.aggregate([
				{ $match: { $or: [{ from_id: id }, { to_id: id }] } },
				{ $group: {
					_id: "wallet",
					wallet_in: { $sum: { $cond: [{ $eq: ["$to_id", id] }, "$amount", 0] } },
					wallet_out: { $sum: { $cond: [{ $eq: ["$from_id", id] }, "$amount", 0] } }
				} }
			]).toArray();

			return entries[0] || { wallet_in: 0, wallet_out: 0 };
		}

		static async balance (id) {
			let io = await WalletController.in_and_out(id);
			return io.wallet_in - io.wallet_out;
		}

		static async assign_balance (list = []) {
			return await Promise.all(list.map(async (campaign) => Object.assign(campaign, {
				wallet: await WalletController.balance(campaign._id)
			})));
		}

	}

	module.exports = WalletController;
