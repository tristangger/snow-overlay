/**
 * @fileoverview Regel: kein Modifizieren der Browser-History �ber history.pushState() oder history.replaceState() 
 * @author A. Baule
 * 
 * TODO
 */

"use strict";

//------------------------------------------------------------------------------
//Rule Definition
//------------------------------------------------------------------------------
const FEHLERMELDUNG = "Regel 9.8: Modifizieren der Browser-History nicht zugelassen";

module.exports = {
		meta: {
			docs: {
				description: "disallow use of history.pushState() and history.replaceState()"
			},
			schema: [] // no options
		},
		create: function(context) {

			// speichert vars, dennen window.history oder history zugewiesen wurde
			var markiert = [];

			// Objekte, die Property 'history' oder 'window.history' enthaelten
			var objects = [];

			return {

				Identifier: function(node) {

					var ancestors = context.getAncestors();
					var parent = ancestors[ancestors.length-1];
					if(parent.parent) {
						var gparent = ancestors[ancestors.length-2];
					}
					if(parent.parent.parent) {
						var ggparent = ancestors[ancestors.length-3];
					}

					if(node.name === "history") {

						if ((parent.type === "MemberExpression") && (gparent) && ((gparent.type === "CallExpression") || (gparent.type === "MemberExpression"))) {

							if (parent.property.name) {
								if ((parent.property.name === "pushState") || (parent.property.name === "replaceState")) {

									// !!! If-Inhalt muss geloescht werden, da es unten nochmal geprueft wird. Wurde aber so nicht getestet, deswegen nicht geloescht
									// dient der Unterscheidung z. B. zwischen window.history.pushState und window.history.pushState(..)
									if ((gparent) && (gparent.type === "MemberExpression")) {

										if ((ggparent) && (ggparent.type === "CallExpression")) {
											context.report({
												node: node,
												message: FEHLERMELDUNG 
											});
										}

										// Bsp.: history.pushState(..)
									} else {
										context.report({
											node: node,
											message: FEHLERMELDUNG 
										});
									}
								}
							}

							// Bsp.: window.history.replaceState( {} , 'foo', '/foo' );
							if (parent.object.name) {
								if(parent.object.name === "window") {
									if ((ggparent) && (ggparent.type === "CallExpression")) {
										if(gparent.property) {
											var name = gparent.property;

											if((name.name === "replaceState") || (name.name === "pushState")) {
												context.report({
													node: node,
													message: FEHLERMELDUNG 

												});

											}
										}
									}
								}
							}

							// Bsp.: this.history.replaceState(..)
							if(parent.object.type === "ThisExpression") {
								if ((ggparent) && (gparent.type === "MemberExpression") && (ggparent.type === "CallExpression")) {
									if(gparent.property) {
										var name = gparent.property.name;

										if((name === "replaceState") || (name === "pushState")) {
											context.report({
												node: node,
												message: FEHLERMELDUNG 

											});

										}
									}
								}
							} 
						}

						// deckt den Speziallfall wie z. B. history[replace? 'replaceState' : 'pushState'](state, ' ', url); ab
						if ((parent.type === "MemberExpression") && (parent.object.name === "history") && (parent.property.type === "ConditionalExpression")) {

							var condition = parent.property;

							if ((condition.consequent.type === "Literal") && (condition.alternate.type === "Literal")) {

								var consequent = condition.consequent;
								var alternate = condition.alternate;

								// Zwei Alternativen werden vergliechen
								if (((consequent.value === "replaceState") || (consequent.value === "pushState"))
										|| ((alternate.value === "replaceState") || (alternate.value === "pushState"))) {

									context.report({
										node: node,
										message: FEHLERMELDUNG 

									});
								}
							}
						}


						//Bsp.: var m = window.history;
						if((gparent) && (gparent.type === "VariableDeclarator") && (parent.type === "MemberExpression")) {

							if ((gparent.init.object) && (gparent.init.object.name === "window")) {
								markiert.push(gparent.id.name);
							}
						}

						//Bsp.: var m = "hallo"; m = window.history;
						if((gparent) && (gparent.type === "AssignmentExpression") && (parent.type === "MemberExpression")) {

							if ((gparent.right.object) && (gparent.right.object.name === "window")) {
								markiert.push(gparent.left.name);
							}
						}

						//Bsp: var m = history;
						if(parent.type === "VariableDeclarator") {
							markiert.push(parent.id.name);
						}

						//Bsp: var m = 12;  m = history;
						if(parent.type === "AssignmentExpression") {

							if((parent.right.type === "Identifier") && (parent.right.name === "history")) {
								markiert.push(parent.left.name);
							}
						}

						// speichere Objekte, die Property window.history haben. objects[0] = Name der Objektes, objects[1] Name des Property
						if((ggparent.parent) && (ggparent.type === "ObjectExpression")) {

							var properties = ggparent.properties;
							for (var i = 0; i < properties.length; i++) {

								var property = properties[i];
								if (property.value.type === "MemberExpression") {

									if((property.value.object.name === "window") && (property.value.property.name === "history")) {

										var array = [];
										if ((ggparent.parent) && (ggparent.parent.type === "VariableDeclarator")) {

											array.push(ggparent.parent.id.name);
											array.push(property.key.name);
											objects.push(array);

										}
									}
								}
							}

							// speichere Objekte, die Property history haben. objects[0] = Name der Objektes, objects[1] Name des Property
						} else {

							if((ggparent) && (gparent.type === "ObjectExpression")) {

								var properties = gparent.properties;
								for (var i = 0; i < properties.length; i++) {

									var property = properties[i];
									if (property.value.type === "Identifier") {

										if (property.value.name === "history")  {

											var array = [];
											if (ggparent.type === "VariableDeclarator") {

												array.push(ggparent.id.name);
												array.push(property.key.name);
												objects.push(array);	
											}
										}	
									}
								}
							}
						}
					}

					// markiert Vars, fuer die gilt: var a = getDOM().getHistory();
					if((node.name === "getDOM"))  {

						//Bsp.: var m = getDOM().getHistory();
						if((gparent.parent.parent) && (gparent.parent.parent.type === "VariableDeclarator") && (gparent.type === "MemberExpression")) {

							if ((gparent.parent.parent.init.property) && (gparent.parent.parent.init.property.name === "getHistory")) {
								markiert.push(gparent.parent.parent.id.name);
							}

							//Bsp.: var m = 5; m = getDOM().getHistory();
						} else {

							if((gparent.parent.parent) && (gparent.parent.parent.type === "AssignmentExpression") && (gparent.type === "MemberExpression")) {
								if ((gparent.parent.parent.right.property) && (gparent.parent.parent.right.property.name === "getHistory")) {
									markiert.push(gparent.parent.parent.left.name);
								}
							}
						}

						if((gparent.parent.parent) && (gparent.type === "MemberExpression")) {
							if (gparent.property.name === "getHistory") {
								if (gparent.parent.parent.type === "AssignmentExpression") {
									var gggparent = gparent.parent.parent;
									var left = gggparent.left;
									if (left.type === "Identifier") {
										markiert.push(left.name);
									}

									// Bsp.: this._history = getDOM().getHistory();
									if (left.type === "MemberExpression") {
										if ((left.object) && (left.property)) {
											if (left.object.type === "ThisExpression") {
												markiert.push(left.property.name);
											}
										}
									}
								}
							}
						}
					}

					// Bsp.: markierteVar.pushState(..)
					if(markiert.indexOf(node.name) != -1) {

						if (parent.type == "MemberExpression") {
							if(parent.property) {
								if((parent.property.name === "replaceState") || (parent.property.name === "pushState")) {
									context.report({
										node: node,
										message: FEHLERMELDUNG 

									});
								}
							}
						}
					}

					// wenn es Objekte mit Property window.history bzw. history gibt und auf diese z. B. pushState angewendet wird
					if (objects.length > 0) {
						for(var i = 0; i < objects.length; i++) {
							var object = objects[i];

							if (node.name === object[0]) {

								if((gparent) && (parent.type === "MemberExpression") && (gparent.type === "MemberExpression")) {

									if ((parent.property.name === object[1])
											&& ((gparent.property.name === "pushState") || (gparent.property.name === "replaceState"))) {

										context.report({
											node: node,
											message: FEHLERMELDUNG 

										});
									}
								}
							}
						}
					}
				}
			}
		}
};
