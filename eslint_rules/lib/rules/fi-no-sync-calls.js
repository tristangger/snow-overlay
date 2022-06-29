/**
 * @fileoverview Regel 9.9 Synchrone Serveraufrufe sind nicht erlaubt
 * @author Maxim Shulyatev
 * 
 * TODO
 */

"use strict";

//------------------------------------------------------------------------------
//Rule Definition
//------------------------------------------------------------------------------
const FEHLERMELDUNG = "Regel 9.9: Synchrone Serveraufrufe sind nicht erlaubt";


module.exports = {
		meta: {
			docs: {
				description: "Regel 9.9 Synchrone Serveraufrufe sind nicht erlaubt",
				category: "FI custom rule"
			},
			schema: [] // no options
		},
		create: function(context) {

			// in 'xml' werden vars gespeichert, in deren 'XMLHttpRequest's gespeichert werden 
			var xml = [];

			// Objekte, die 'async: false' bzw. 'async: !1' enthaelten
			// Es ist eine Beschraenkung, da Properties nicht unbedingt 'async' heissen muessen. 
			// Ansonsten muss man alle Objekte speichern, die mind. ein Property mit dem Wert 'false' bzw '!1' enthaelten
			var asyncObjects = [];


			return {

				Identifier: function(node) {

					// Speichere Objekte vom Typ 'XMLHttpRequest' in var 'xml'
					if (node.name === "XMLHttpRequest") {	

						var parent = node.parent;
						var gparent = parent.parent;
						if (gparent.id) {
							var gparentIdName = gparent.id.name;
							if (gparent.type === "VariableDeclarator") {
								xml.push(gparentIdName);

							}
						}

						// !!!Dieser Block muss evtl. geloescht werden!!!
						// Es werden einige vars markiert, wenn..
					} else if (node.name.toLowerCase().indexOf("xhr") !== -1) {

						var parent = node.parent;
						var gparent = parent.parent;

						// .. xhr ein Property eines Objektes ist
						// Bsp.: var a = {... xhr:.., ...}; var xhr = a.xhr; xhr.open(..);
						if ((parent.type === "MemberExpression") && (gparent.type === "VariableDeclarator")) {

							if (gparent.id) {
								xml.push(gparent.id.name);
							}
						}

						// .. xhr eine Funktion ist. Es wird angenommen, dass diese Funktion ein xhr-Objekt zurückliefert
						// Bsp.: var a = {... xhr:.. ...}; var xhr = a.xhr; xhr.open(..);
						if ((parent.type === "CallExpression") && (gparent.type === "VariableDeclarator")) {

							if (gparent.id) {
								xml.push(gparent.id.name);
							}
						}

						// .. xhr eine Funktion als Property eines Objektes ist
						// Bsp.: var a = {... xhr: function(){..}. ...}; var xhr = a.xhr; xhr.open(..);
						if ((gparent.parent) && (parent.type === "MemberExpression") && (gparent.type === "CallExpression") && (gparent.parent.type === "VariableDeclarator")) {

							if (gparent.parent.id) {
								xml.push(gparent.parent.id.name);
							}
						}
					}


					// speichere Objekte, die Property 'async: false' oder 'async: !1' enthaelten
					if ((node.name  === "async") && (node.parent.type === "Property") && (node.parent.parent.type === "ObjectExpression")) {

						var prop = node.parent;

						// Wenn 'async: false' oder 'async: !1'
						if (((prop.key.name === "async") && (prop.value.type === "Literal") && (prop.value.value === false)) 
								|| ((prop.key.name === "async") && (prop.value.type === "UnaryExpression") && (prop.value.argument) && (prop.value.argument.value === 1))) {

							if (node.parent.parent.parent) {
								var ggparent = node.parent.parent.parent;

								if((ggparent.type === "AssignmentExpression") || (ggparent.type === "VariableDeclarator")) {

									// var x; x = {... async: false ...}
									if(ggparent.type === "AssignmentExpression") {
										var left = ggparent.left;
										if (left.type === "Identifier") {

											// speichere 'x' in 'asyncObjects'
											asyncObjects.push(left.name);

										}
									}

									// var y = {... async: false ...}
									if(ggparent.type === "VariableDeclarator") {
										var ident = ggparent.id;
										if (ident.type === "Identifier") {

											// speichere 'y' in 'asyncObjects'
											asyncObjects.push(ident.name);

										}
									}
								}
							}
						}
					}

					// Pruefe, ob async-Property eines gespeicherten Objektes geaendert wird und korrigiere ggf. 'asyncObjects' - Array
					if(node.parent.parent) {
						if((node.name === "async") && (node.parent.type === "MemberExpression") && (node.parent.parent.type == "AssignmentExpression")) {
							var right = node.parent.parent.right;

							// markiere das Object als 'gefaehrlich'
							// Bsp.: Es war a.async = true (nicht in 'asyncObjects' gespeichert), es wird a.async = true
							if (right.value === false) {
								asyncObjects.push(node.parent.object.name);
							}
							// loesche die Markierung, wenn 'async' auf 'true' geandert wird
							if (right.value === true) {
								if (asyncObjects.lastIndexOf(node.parent.object.name) != -1) {
									var index = asyncObjects.lastIndexOf(node.parent.object.name);
									asyncObjects.splice(index, 1);
								}
							}
						}
					}


					/*********************************
					 ***EIGENTLICHE FUNKTIONALITAET***
					 ********************************/

					// Pruefe, ob .open(...) auf gespeicherte vars angewendet wird
					// Bsp.: var xhr = new XMLHttpRequest(); xhr.open('GET', '/bar/foo.txt', false);
					if (xml.length > 0) {

						for (var i = 0; i < xml.length; i++) {
							if (node.name === xml[i]) {
								var parent = node.parent;
								if (parent.type === "MemberExpression") {
									var parentProperty = parent.property;
									if(parentProperty.name === "open") {
										var gparent = parent.parent;
										if(gparent.type === "CallExpression") {
											var args = gparent.arguments;
											if(args.length > 0) {
												for (var j = 0; j < args.length; j++) {
													var arg = args[j];

													// 'true/false' bezieht sich auf async
													if ((arg.type === "Literal") && (arg.value === false)) {

														context.report({
															node: node,
															message: FEHLERMELDUNG     		   
														});

														// 'async' wird mit !1 gesetzt
													} else if (arg.type === "UnaryExpression") {

														if ((arg.argument) && (arg.operator === "!") && (arg.argument.value === 1 )) {

															context.report({
																node: node,
																message: FEHLERMELDUNG     		   
															});
														}

														// 'async' wird mit x.async gesetzt. 'x' ist als 'gefaehlich' markiert. 
													} else if (arg.type === "MemberExpression") {

														if ((arg.object.type === "Identifier") && (arg.property.type === "Identifier")) {

															if ((asyncObjects.indexOf(arg.object.name) !== -1) && (arg.property.name === "async")) {

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
							}
						}
					} 

					// Betrachte 'ajax'
					if(node.name === "ajax") {

						var parent = node.parent;
						if(parent.type === "MemberExpression") {
							var parentObject = parent.object;
							// z. B. $.ajax(...)
							// naechste Zeile ist auskommentiert, da es auch Aufrufe der Form 'abc.ajax({...})' gibt!
							// if((parentObject.name === "jQuery") || (parentObject.name === "$")) {
							if ((parent.parent) && (parent.parent.type === "CallExpression")) {
								var gparent = parent.parent;
								var args = gparent.arguments;
								for (var i = 0; i < args.length; i++) {

									// untersuche nur Argumente, die Objekte sind und in 'ajax' definiert werden
									if(args[i].type === "ObjectExpression") {
										var properties = args[i].properties;

										// untesuche Properties des Objektes. Das sind z. B. 'url', 'async' usw.
										for (var k = 0; k < properties.length; k++) {

											var property = properties[k];
											if(property.type === "Property") {

												// untersuche Namen und Values der einzelnen Propertis weiter 
												var key = property.key;
												var value = property.value;

												// betrachte Property 'async'. Wenn es keine Property 'async' gibt, wird es auch keine Fehlermeldung geworfen, da der default-Wert 'true' ist
												if (key.name === "async") {

													// wenn 'async' als !1 gesetzt ist
													if ((value.type === "UnaryExpression") && ((value.argument) && (value.argument.type === "Literal") && (value.argument.value === 1) )) {

														context.report({
															node: node,
															message: FEHLERMELDUNG	        		   
														});

														// Der Wert von 'async' wird z. B. mit 'a.async' gesetzt. 
														// Bsp. .ajax({url:.., async: a.async, ...})
													} else if (value.type === "MemberExpression") {

														// wenn 'a.async = false' bzw. 'a.async = !1'
														if ((asyncObjects.indexOf(value.object.name) !== -1) && (value.property.name === "async")) {

															context.report({
																node: node,
																message: FEHLERMELDUNG	        		   
															});

														}

													} else {

														// 'async: false'
														if ((value.type === "Literal") && (value.value === false)) {

															context.report({
																node: node,
																message: FEHLERMELDUNG	        		   
															});
														}
													}
												} 
											}
										}

										// Untersuche Faelle, wenn .ajax(..) ein Objekt als Parameter erhaelt
										// Bsp.: .ajax(foo); ('foo' ist ein 'gefaehliches' Objekt und wurde fruher gespeichert)
									} if(args[i].type === "Identifier") {

										if (asyncObjects.indexOf(args[i].name) != -1) {
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
		} 
};