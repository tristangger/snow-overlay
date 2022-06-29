/**
 /**
 * @fileoverview Regel 9.10: Verwendung von window.postMessage nicht zugelassen.
 * 
 * @author Maxim Shulyatev
 */

"use strict";

//------------------------------------------------------------------------------
//Rule Definition
//------------------------------------------------------------------------------
const FEHLERMELDUNG = "Regel 9.10: Verwendung von window.postMessage mit '*' als targetOrigin nicht zugelassen";


module.exports = {
		meta: {
			docs: {
				description: "Regel 9.1: Verwendung von window.postMessage nicht zugelassen",
				category: "FI custom rule"
			},
			schema: [] 
		},
		create: function(context) {

			var markierteVars = [];

			return {

				Identifier: function(node) {

					var ancestors = context.getAncestors();
					var parent = ancestors[ancestors.length-1];
					var gparent = ancestors[ancestors.length-2]; 


					// Markiere Variable, deren ein Literal mit 'https' zugewiesen wird
					if (parent.type === "VariableDeclarator") {
						if(parent.init) {
							if((parent.init.type === "Literal") && (parent.init.value === "https://")) {
								markierteVars.push(node.name);
							}
						}
					}

					if ((node.name === "postMessage") && (parent.type === "MemberExpression") 
							&& (gparent.type === "CallExpression")) {

						var args = gparent.arguments;
						var noHttps = true;
						if(args.length > 1) {

							// Bsp.: window.postMessage('Hallo', '*');
							if(args[1].type === "Literal") {
								if((args[1].value).indexOf("https://") != -1) {
									noHttps = false;
								}
							}

							// Bsp.: window.postMessage('message', url);
							if(args[1].type === "Identifier") {
								if (markierteVars.indexOf(args[1].name) != -1) {
									noHttps = false;
								}
							}

							// Bsp.: window.postMessage("process-tick", window.location);
							if(args[1].type === "MemberExpression") {
								var arg = args[1];
								if (arg.object && arg.property) {
									if (arg.object.type != "MemberExpression") {
										if(arg.object.name === "window" && arg.property.name === "location") {
											noHttps = false;
										}
									}
									if(arg.object.type === "MemberExpression") {
										var obj = arg.object;
										if(obj.object && obj.property) {
											if(obj.object.name === "window" && obj.property.name === "location") {
												noHttps = false;
											}
										}
									}
								}
							}

						}
						if(noHttps === true) {
							context.report({
								node: node,
								message: FEHLERMELDUNG
							});
						}
					}
				}
			}
		}
};
