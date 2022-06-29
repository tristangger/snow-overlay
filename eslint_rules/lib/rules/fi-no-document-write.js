/**
 * @fileoverview Regel 9.3: Verwendung von document.write nicht erlaubt 
 * @author Maxim Shulyatev
 * 
 * TODO
 */

"use strict";

//------------------------------------------------------------------------------
//Rule Definition
//------------------------------------------------------------------------------
const FEHLERMELDUNG = "Regel 9.3: document.write nicht zugelassen";

module.exports = {
		meta: {
			docs: {
				description: "Regel 9.3: document.write nicht zugelassen",
				category: "FI custom rule"
			},
			schema: [] 
		},
		create: function(context) {

			// Vars, deren entweder 'document' oder 'window.document' zugewiesen wurde
			// Fuer die Vereinfachung wird hier auch 'goog.global' gespeichert (z. B. var x = goog.global (entspricht 'window'!))
			var vars = [];

			// Objects, die ein Property mit dem Wert 'document' oder 'window.document' enthaelten
			// Objects besteht aus Arrays, in deren das 1. Element die Name des Objektes und das 2. Element die Name des Property sind
			var objects = [];


			return {

				Identifier: function(node) {
					const ancestors = context.getAncestors();
					var parent = ancestors[ancestors.length-1];
					var gparent = ancestors[ancestors.length-2]; 


					// In diesem Teil werden 'gefaehrliche' Vars gespeichert
					if ((node.name === "document") || (node.name === "$document")) {

						// Bsp.: x = document;
						if((parent) && (parent.type === "VariableDeclarator")) {

							// Speichere var x in 'vars'
							if((parent.init) && (parent.init.type === "Identifier") && ((parent.init.name === "document") || (parent.init.name === "$document"))
									&& (parent.id) && (parent.id.type === "Identifier")) {
								vars.push(parent.id.name);
							}

							// Bsp.: var a = 'hallo'; a = window.document;
						} else if ((gparent) && (parent.type === "MemberExpression") && (gparent.type === "AssignmentExpression")) {

							if ((parent.object.name === "window") || (parent.object.name === "$window")) {

								vars.push(gparent.left.name);

							}

							// Bsp.: var a = 'hallo'; a = document;	
						} else if ((gparent) && (parent.type === "AssignmentExpression") && (gparent.type === "ExpressionStatement")) {

							if ((parent.right.name === "document") || parent.right.name === "$document") {

								vars.push(parent.left.name);

							}

							// Bsp.: x = window.document;
						} else if ((gparent) && (parent.type === "MemberExpression") && (gparent.type === "VariableDeclarator")) {

							// Speichere var x in 'vars'
							if((gparent.init.object) && ((gparent.init.object.name === "window") || (gparent.init.object.name === "$window")) && (gparent.id.type === "Identifier")) {
								vars.push(gparent.id.name);
							}

							// bsp.: var x = {y: window.document (oder 'document') }	
						} else if ((gparent.parent)) {

							var ggparent = gparent.parent;

							// var x = {y: document}
							if ((parent.type === "Property") && (gparent.type === "ObjectExpression") && (ggparent.type === "VariableDeclarator")) {

								var tempObject1 = [];
								tempObject1.push(ggparent.id.name);
								tempObject1.push(parent.key.name);
								objects.push(tempObject1);

							}

							// var x = {y: window.document}
							if(ggparent.parent) {

								var gggparent = ggparent.parent;
								if((parent.type === "MemberExpression") && (gparent.type === "Property") 
										&& (ggparent.type === "ObjectExpression") && (gggparent.type === "VariableDeclarator")) {

									if ((parent.object.name === "window") || (parent.object.name === "$window")) {

										// speichere Object und die zugehoerige Properties 
										var tempObject2 = [];
										tempObject2.push(gggparent.id.name);
										tempObject2.push(gparent.key.name);
										objects.push(tempObject2);

									}
								}
							}
						}
					}

					// speichere Vars, deren goog.global zugewiesen wird
					if (node.name === "goog") {

						if ((gparent) && (parent.type === "MemberExpression") && (gparent.type === "VariableDeclarator")) {

							if ((parent.property.type === "Identifier") && (parent.property.name === "global")) {

								if (gparent.id) {
									vars.push(gparent.id.name);
								}
							}
						}
					}


					// In diesem Teil wird es nach Abweichungen von Regeln gesucht
					if ((node.name === "write") && (ancestors.length>=2)) {

						if ((parent.type === "MemberExpression") && (gparent.type === "CallExpression")) {

							var obj = parent.object;

							// Bsp.: document.write(...) oder xyz.write(...)
							if (obj.type === "Identifier") {
								// document.write(...)
								if ((obj.name === "document") || (obj.name === "$document")) {

									context.report({
										node: node,
										message: FEHLERMELDUNG
									});

									// xyz.write(..:); xyz wurde frueher markiert
								} else if (vars.indexOf(obj.name) !== -1) {

									context.report({
										node: node,
										message: FEHLERMELDUNG
									});
								}

								// Bsp.: abc.xyz.write(...); abc.xyz wurde frueher markiert
							} else if (obj.type === "MemberExpression") {

								// Bsp.: goog.global.document.write(...)
								if ((obj.object.type === "MemberExpression") && (obj.property.type === "Identifier")) {

									var objObj = obj.object;

									if((objObj.object.type === "Identifier") && (objObj.property.type === "Identifier")) {

										if ((objObj.object.name === "goog") && (obj.property.name === "document") && (objObj.property.name === "global")) {

											context.report({
												node: node,
												message: FEHLERMELDUNG
											});
										} 
									}

									// Bsp.: window.document.write(...)
								} else if ((obj.object.type === "Identifier") && (obj.property.type === "Identifier") 
										&& ((obj.object.name === "window") || (obj.object.name === "$window")) && (obj.property.name === "document")) {

										context.report({
											node: node,
											message: FEHLERMELDUNG
										});
									
								} else {

									// gespeicherte var ist goog.global
									if ((vars.indexOf(obj.object.name) > -1) && (obj.property.name === "document")) {
										context.report({
											node: node,
											message: FEHLERMELDUNG
										});

									} else {

										// Bsp.: var a.b = document;
										for (var i = 0; i < objects.length; i++) {

											var tempObj = objects[i];

											// a.b.write(...);
											if ((obj.object.name === tempObj[0]) && (obj.property.name === tempObj[1])) {

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
		}
};
