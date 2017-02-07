
	"use strict";

	const { DBUtil } = require("util/");
	const { CharacterController } = require("controller/");
	const sanitize_html = require("sanitize-html");

	class EntityController {

		static sanitize (type, name, description, owner, ip) {
			if(
				!name ||
				name.trim() == "" ||
				!description ||
				description.trim() == "" ||
				!owner
			)
				throw "not all fields set";
			return {
				name: 			sanitize_html(name.trim()),
				description: 	sanitize_html(description),
				type,
				owner: {
					id: 	owner.id,
					name: 	owner.name
				},
				ip
			};
		}

		static async findOne (_id, type) {
			let collection = await DBUtil.get_collection("entities");
			let entity = await collection.findOne({ _id, type });
			if(!entity)
				throw `Invalid ${type} id`;
			return entity;
		}

		static async find (type, options = {}, { sort = { "data.end": 1 }, page = 1, limit = 18 } = {}) {

			await this.security_check(options);

			let collection = await DBUtil.get_collection("entities");
			return await collection
				.find(Object.assign({ type }, options))
				.sort(sort)
				.skip(Math.max(page - 1, 0) * limit)
				.limit(limit)
				.toArray();
		}

		static async remove (_id, to_id = _id) {
			let entities = await DBUtil.get_collection("entities");
			await entities.remove({ _id });

			let transactions = await DBUtil.get_collection("transactions");
			await transactions.remove({ to_id });
		}

		static async find_by_owner (type, { id }, options = {}, config = {}) {
			return EntityController.find(
				type,
				Object.assign({ "owner.id": id }, options),
				Object.assign({ sort: { "created": -1 } }, config)
			);
		}

		static async count_by_owner ({ id }) {
			let entities = await DBUtil.get_collection("entities");
			return await entities.find({ "owner.id": id, "data.end": { $gt: Date.now() } }).count();
		}

		static async update (_id, $set, options) {

			await this.security_check(options);

			let entities = await DBUtil.get_collection("entities");
			return await entities.update({ _id }, { $set });
		}

		static async security_check (options = {}) {

			if(options.is_banned)
				if(await CharacterController.is_banned(options.is_banned) == true)
			throw "You are banned";

			if(options.is_admin)
				if(await CharacterController.is_admin(options.is_admin) == false)
			throw "You are not an admin";

		}

	}

	module.exports = EntityController;
