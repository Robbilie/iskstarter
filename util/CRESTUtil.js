
	"use strict";

	const request 			= require("request");
	const querystring 		= require("querystring");
	const config 			= require("config/");

	class CRESTUtil {

		static getBase64 () {
			return new Buffer(config.crest.clientID + ":" + config.crest.secretKey).toString("base64");
		}

		static generateLoginUrl (scopes, state) {
			return Promise.resolve(
				config.crest.login.url + "/oauth/authorize" +
				"?" + unescape(querystring.stringify({
					response_type: 	"code",
					redirect_uri: 	config.site.url + config.crest.callBack,
					client_id: 		config.crest.clientID,
					scope: 			scopes.join(" "),
					state: 			state
				}))
			);
		}

		// { 'grant_type' : 'authorization_code', 'code': "asdasdasdad" }
		static getTokens (data) {
			return new Promise((resolve, reject) => {
				request(
					{
						method: 		"POST",
						localAddress: 	config.site.localIP,
						url: 			`${config.crest.login.url}/oauth/token`,
						headers: {
							"User-Agent": config.site.userAgent,
							"Authorization": "Basic " + CRESTUtil.getBase64()
						},
						form: data
					},
					(err, reqres, body) => {
						if(err)
							return reject(err);
						try {
							let res 			= JSON.parse(body);
							if(res.error)
								throw new Error(res.error);
							let accessToken 	= res.access_token;
							let refreshToken 	= res.refresh_token;
							let accessUntil		= new Date().getTime() + (res.expires_in * 1000);
							return resolve({ accessToken: accessToken, refreshToken: refreshToken, accessUntil: accessUntil });
						} catch (e) {
							return reject(e);
						}
					}
				).on("error", e => reject(e));
			});
		}

		static getInfo (accessToken) {
			return new Promise((resolve, reject) => {
				request({
						method: 		"GET",
						localAddress: 	config.site.localIP,
						url: 			`${config.crest.login.url}/oauth/verify`,
						headers: {
							"User-Agent": 		config.site.userAgent,
							"Authorization": 	"Bearer " + accessToken
						}
					},
					(err, reqres, body) => {
						if(err)
							return reject(err);
						try {
							var res = JSON.parse(body);
							if(res.error)
								throw new Error(res.error);
							console.log("#### SCOPES", res.Scopes);
							return resolve({
								id: 		res.CharacterID,
								name: 		res.CharacterName,
								scopes: 	res.Scopes ? res.Scopes.split(" ") : [],
								tokenType: 	res.TokenType,
								ownerHash: 	res.CharacterOwnerHash
							});
						} catch (e) {
							return reject(e);
						}
					}).on("error", e => reject(e));
			});
		}

		/*
		static getEndpoint (options) {
			return new Promise((resolve, reject) => {
				var params = {
					method: 		options.method || "GET",
					localAddress: 	config.site.localIP,
					url: 			`${config.crest.api.url}${options.path}`,
					headers: {
						"User-Agent": 		config.site.userAgent,
						"Content-Type": 	options.contentType || "application/json",
					}
				};
				if(options.accessToken)
					params.headers["Authorization"] = "Bearer " + options.accessToken;
				if(options.data)
					params.json = options.data;
				if(options.data)
					params.headers["Content-Length"] = options.data.length;
				if(options.accept)
					params.headers["Accept"] = options.accept;
				request(params, (err, reqres, body) => {
					if(err)
						return reject(err);
					try {
						var res = JSON.parse(body);
						return resolve(res);
					} catch (e) {
						return reject(e);
					}
				}).on("error", e => reject(e));
			});
		}
		*/

	}
	module.exports = CRESTUtil;
