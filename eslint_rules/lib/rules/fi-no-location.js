/**
 * @fileoverview Regel: kein Modifizieren der window.location
 * @author Maxim Shulyatev
 * 
 * TODO
 */

"use strict";

//------------------------------------------------------------------------------
//Rule Definition
//------------------------------------------------------------------------------


//Prueft, ob arr2 Teilmenge von arr1 ist
function isSubset(arr1, arr2) {

	var arr2InArr1 = true;
	// leeres Array ist immer enthalten
	if (arr2.length != 0) {
		for (var i = 0; i <= arr2.length-1; i++) {
			if (arr1.indexOf(arr2[i]) === -1) {
				arr2InArr1 = false;
				break;
			}
		}
	}
	return arr2InArr1;
}


//Sucht, ob es fuer eine Variable in vars ein groesseres Scope in fkt als in fkt mit dem Index 'index' gibt
function checkScope(variable, index, arr, fkt, vars) {
	var antwort = false;
	for (var k = 0;  k <= vars.length-1; k++) {
		if (fkt[k].length > fkt[index].length) {
			if (vars[k] === variable) {
				if (isSubset(arr, fkt[k])) {
					antwort = true;
					break;
				}
			}
		}
	}
	return antwort;
}

//Sucht das groesste Scope der variable, s. d. vars ist Teilmenge von arr
function checkIndex(variable, index, arr, fkt, vars) {
	var antwort = index;
	var max = 0;
	for (var k = 0;  k <= vars.length-1; k++) {

		if (vars[k] === variable) {
			if ((fkt[k].length > fkt[index].length) && (fkt[k].length >= max)) {
				max = fkt[k].length;
				if (isSubset(arr, fkt[k])) {
					antwort = k;
				}
			}
		}
	}
	return antwort;
}

//pruefe, ob ein Array eine Teilmege eines anderen Arrays ist
function checkArrIsInOtherArr(arr, inArr) {
	var enthaelten = false;
	for (var i = 0; i <= inArr.length-1; i++) {
		var aktArr = inArr[i];
		if ((arr[0] === aktArr[0]) && (arr[1] === aktArr[1])) {
			enthaelten = true;
			break;
		}
	}
	return enthaelten;
}

//Pruefe, ob es eine var gibt, deren name mit einem Object uebereinstimmt
function checkVarNameEqObjName(variable, arr) {
	var enthaelten = false;
	if (arr.length > 0) {
		for (var i = 0; i <= arr.length-1; i++) {
			var aktArr = arr[i];
			if (variable === aktArr[0]) {
				enthaelten = true;
				break;
			}
		}
	}
	return enthaelten;
}



module.exports = {
		meta: {
			docs: {
				description: "disallow modify window.location"
			},
			schema: [] // no options
		},
		create: function(context) {

			// speichert ALLE deklarierte/definierte Variable
			var vars = [];

			// speichert, ob eine Variable aus 'vars' 'window.location' enthaelt
			// Bsp.: vars[5] ( var a = window.location) und markiert[5] = true
			var markiert = [];

			// name der Funktion, bezieht sich auf tiefe; enthaelt Arrays, die ggf. leer sind
			// Es gilt: leeres Array ist die Teilmenge von jedem Array
			var fkt = [];

			// speichert Objekte(als Array, 1. Index -Obj-Name, 2.,3.,.. Indecies -Propertis), deren properties den Wert window.location haben
			var objectArray = [];

			// speichert Namen aller Objekte
			var objk = [];

			// report
			function fehlermeldung(node) {
				context.report({
					node: node,
					message: "Regel 9.7/9.8: Schreibzugriffe auf window.location nicht zugelassen"
				});
			}



			return {

				Identifier: function(node) {

					var ancestors = context.getAncestors();
					var parent = ancestors[ancestors.length-1];
					var gparent = ancestors[ancestors.length-2];


					if (parent.type === "VariableDeclarator") {
						// speichere var name
						vars.push(node.name);


						var init = parent.init;

						// Unterscheide zwischen var a = 15 und var a = window.location und var a
						// var b = window.location;
						if ((init != null) &&  (init.type === "MemberExpression")) {
							var obj = init.object;
							var prop = init.property;
							var objectName = obj.name;
							var propertyName = prop.name;

							//prueft, ob ein Objekt bereits gespeichert wurde
							//Bsp. var a = {abc: window.location, b: 'hallo'}; --> var b = a.abc; b.href = 'google.de';
							var objVorhanden = false;
							for (var i = 0; i <= objectArray.length-1; i++) {
								var arr = objectArray[i];
								if (objectName === arr[0]) {
									for (var j = 1; j <= arr.length-1; j++) {
										if (arr[j] === propertyName) {
											objVorhanden = true;
											break;
										}
									}
								}
							}

							// markiere var, wenn sie den Wert window.location enthaelt
							if (((objectName === "window") || (objectName === "$window")) && (propertyName === "location") || (objVorhanden)) {
								markiert.push(true);
							} else {
								markiert.push(false);
							}	

							// var b = location;
						} else {

							if ((init != null) && (init.type === "Identifier") && ((init.name === "location") || (init.name === "$location"))) {
								markiert.push(true);

								// Untersuche Funktionen, die window.location zurueckliefern koennen(!)
							} else if ((init != null) && (init.type === "CallExpression")) {

								var initCallee = init.callee;
								if (initCallee.type === "MemberExpression") {

									if (((initCallee.object.callee) && (initCallee.object.callee.type === "Identifier") && (initCallee.object.callee.name === "getDOM"))
											&& ((initCallee.property) && (initCallee.property.name === "getLocation"))) {

										markiert.push(true);

									} else {
										markiert.push(false);
									}
								} else {
									markiert.push(false);
								}

								// Andere init-types oder gar keine Initialisierung
							} else {

								markiert.push(false);
							}
						}

						// Funktionen, die das Element umgeben
						var fktNamen = [];
						for (var j = 0; j <= ancestors.length-1; j++) {

							if (ancestors[j].type === "FunctionDeclaration") {
								var fktId = ancestors[j].id;
								fktNamen.push(fktId.name);
							}
						}

						fkt.push(fktNamen);

						if ((parent.id.name === "location") && (node.name === "location") && (fktNamen.length === 0)) {

							// Bsp.: a.t  = function(e) {var location = "googele.de";} (Keine Fkt.Deklaration sonder Fkt.Expression!)
							var funcExpr = false;
							for (var j = 0; j <= ancestors.length-1; j++) {

								if (ancestors[j].type === "FunctionExpression") {
									funcExpr = true;
									break;
								}
							}

							// wenn 'location' nicht in einer Funktion definiert ist, gilt sie als global! -> Fehlermeldung, da ueberschrieben wird
							if ((fktNamen.length === 0) && (!funcExpr)) {
								fehlermeldung(node);
							}
						} 
					}

					//Speichere Id's der Objekte mit 'gefaehrlichen' Properties
					if (ancestors[ancestors.length-3]) {
						if ((parent.type === "Property") && (gparent.type === "ObjectExpression") && (ancestors[ancestors.length-3].type === "VariableDeclarator")) {

							var objName = ancestors[ancestors.length-3].id.name;
							var tempArray =[];

							var value = parent.value;

							objk.push(objName);

							if (value.type === "Identifier") {
								if ((value.name === "location") || (value.name === "$location")) {
									// speichere name des Objektes
									tempArray.push(objName);
									//speiche property
									tempArray.push(node.name);
									objectArray.push(tempArray);
								}
							}

							if (value.type === "MemberExpression") {
								if (((value.object.name === "window") || (value.object.name === "$window")) && (value.property.name === "location")) {
									// speichere name des Objektes
									tempArray.push(objName);
									//speiche property
									tempArray.push(node.name);
									objectArray.push(tempArray);
								}
							}
						}
					}

					if ((parent.type === "Property") && (gparent.type === "ObjectExpression") && (ancestors[ancestors.length-3].type === "AssignmentExpression")) {
						var objName = ancestors[ancestors.length-3].left.name;
						objk.push(objName);
					}

					//
					// Eigentliche Funktionalitaet
					//


					// Bsp: this.location = ... oder this.$location = ... oder this.$location.url(...)
					if (((node.name === "location") || (node.name === "$location")) && (parent.type === "MemberExpression") && (parent.object.type === "ThisExpression")) {

						// Bsp.: this.location = 
						if ((gparent.type === "AssignmentExpression")) {

							if (gparent.left.property) {
								var property = gparent.left.property;
								if ((property.name === "location") || (property.name === "$location")) {

									fehlermeldung(node);

								}
							}
						}

						// Bsp.: this.location.assign(..)
						if ((node.name === "location") && (gparent.type === "MemberExpression")) {
							if (gparent.property) {
								var property = gparent.property;
								if ((property.name === "assign") || (property.name === "replace")) {
									fehlermeldung(node);
								}
							}

						} else if ((node.name === "$location") && (gparent.type === "MemberExpression")) {

							if (gparent.property) {
								var property = gparent.property;
								if (((property.name === "url") || (property.name === "path")
										|| (property.name === "search") || (property.name === "hash") || (property.name === "state") || (property.name === "replace"))) {

									// Unterscheide this.$location.url() (kein Treffer) vs. this.$location.url(xyz) (Treffer); replace ist auch ohne Args ein Treffer, da es history modifiziert wird!
									if ((property.name === "replace")) {

										fehlermeldung(node);

									} else {
										if ((gparent.parent) && (gparent.parent.type === "CallExpression") && (gparent.parent.arguments) && (gparent.parent.arguments.length > 0)) {

											fehlermeldung(node);
										}
									}
								}
							}
						}
					}


					// Betrachte Zuweisungen
					if ((parent.type === "AssignmentExpression") || (gparent.type === "AssignmentExpression")) {

						// Bsp: window.location = 12; oder location.href = "foo";
						if ((node.name === "location") && (parent.type === "MemberExpression") && (gparent.type === "AssignmentExpression")) {

							var left = gparent.left;
							if (left.type === "MemberExpression") {


								if (((left.object.name === "window") || (left.object.name === "$window")) && (left.property.name === "location")) {
									fehlermeldung(node);
								}
								if (((left.object.name === "location") || (left.object.name === "$location")) && (parent.property.name != "") && (vars.indexOf('location') === -1)) {
									fehlermeldung(node);
								}
							}
						}

						// Bsp: location = 'abc'
						if (((node.name === "location") && (parent.type === "AssignmentExpression") && (vars.indexOf('location') === -1))
								|| ((node.name === "$location") && (parent.type === "AssignmentExpression") && (vars.indexOf('$location') === -1))) {

							var left = parent.left;
							if ((left.type === "Identifier")) {

								fehlermeldung(node);

							}
						}

						// Wenn die Var, deren ein Wert zugewiesen wird, bereits defeniert wurde
						if (vars.indexOf(node.name) > -1) {

							for (var i = 0; i <= vars.length-1; i++) {

								if ((vars[i] === node.name) && (!checkVarNameEqObjName(node.name, objectArray))) {

									if (markiert[i] === true) {
										// Bestimme Namen der Funktionen, die diese var umgeben
										var fktScopes = [];
										for (var j = 0; j <= ancestors.length-1; j++) {

											if (ancestors[j].type === "FunctionDeclaration") {
												var ancestor = ancestors[j];
												var fktId = ancestor.id;
												fktScopes.push(fktId.name);
											}
										}


										// ist wichtig z. B. fuer
										// var a = window.location; function foo() {if(true) {var a = 34;} a = 'foobar.com'; } a = 'hallo'; ,
										// da sonst eine doppelte Fehlermeldung erzeugt wird (siehe Quellcode) -> Fehler in Eslint
										// != null, da k = ' hallo' zugelassen und k.href = 'hallo' nicht
										if (parent.property != null) {
											if (!checkScope(node.name, i, fktScopes, fkt, vars)) {

												var defScopes = fkt[i];
												if (isSubset(fktScopes, defScopes)) {

													fehlermeldung(node);

												}
											}
										}

										// Bsp: var a, b; function abc() {a = window.location; b = 5;} b = {href: 'foobar'}; a = b; a.href = 'foo';
										// entfert Markierung, falls den Variable ein ungefaehrliches Objekt zugewiesen wird
										if (parent.type === "AssignmentExpression") {

											var enthalten = false;
											for (var t = 0; t <= objectArray.length-1; t++) {

												var aktArr = objectArray[t];

												if (aktArr[0] === parent.right.name) {
													enthalten = true;
													break;
												}
											}

											var index = checkIndex(node.name, i, fktScopes, fkt, vars);
											var left = parent.left;
											var right = parent.right;

											if ((left.name === node.name) && (!enthalten) && (objk.indexOf(right.name) != -1)) {

												markiert[index] = false;

											}
										}
									}  

									// untersuche nicht markierte Vars
									if (markiert[i] === false){

										var scopes = [];
										for (var j = 0; j <= ancestors.length-1; j++) {

											if (ancestors[j].type === "FunctionDeclaration") {
												var ancestor = ancestors[j];
												var fktId = ancestor.id;
												scopes.push(fktId.name);
											}
										}


										if (parent.type === "AssignmentExpression") {
											if(isSubset(scopes, fkt[i])) {

												var index = checkIndex(node.name, i, scopes, fkt, vars);

												var right = parent.right;

												if ((right != null) &&  (right.type === "MemberExpression")) {
													if (!checkVarNameEqObjName(node.name, objectArray)) {
														var obj = right.object;
														var prop = right.property;
														var objectName = obj.name;
														var propertyName = prop.name;

														// markiere var, wenn sie den Wert window.location enthaelt
														if ((objectName === "window") && (propertyName === "location")) {
															markiert[index] = true;
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

					//Bsp: $(location).attr('href','http://www.example.com');
					if ((gparent.type === "MemberExpression") && (node.name === "location")) {
						if (parent.type === "CallExpression") {
							var parentCallee = parent.callee;
							var parentArgs = parent.arguments;
							if (((parentCallee.type === "Identifier") && ((parentCallee.name === "$") || (parentCallee.name === "jQuery")))) {

								fehlermeldung(node);
							}
						}
					}

					//  var a = window.location; function foo() {if(true) {var a = 34;} a = 'foobar.com'; } a.replace('hallo');
					if (parent.type === "MemberExpression") {

						//Bsp: window.location.href = 13;
						if (node.name === "location") {

							if (ancestors[ancestors.length-3]) {
								var ggparent = ancestors[ancestors.length-3];
								if ((ggparent.type === "AssignmentExpression") && (gparent.type === "MemberExpression") && (parent.type === "MemberExpression")) {

									var left = ggparent.left;
									if (left.type === "MemberExpression") {
										var object = left.object;
										//var property = left.property;
										//var object = parent.object;
										//var property = parent.property;
										// aenderung
										//if((objectObject.name) && (propertyProperty.name)) {
										if (object.object) {

											if ((((object.object.name === "window") || (object.object.name === "$window") ) && (object.property.name === "location"))
													&& ((gparent.property.name != null)) ) {

												fehlermeldung(node);
											}
										}
									}
								}
							}
						}


						if ((node.name === "location") || (node.name === "$location")) {
							// Bsp: location.replace("fd");
							if (gparent.type === "CallExpression") {
								var callee = gparent.callee;
								if (callee.type === "MemberExpression") {
									var calleeObject = callee.object;
									var calleeProperty = callee.property;

									if ((calleeObject.name === "location") && ((calleeProperty.name === "assign") || (calleeProperty.name === "replace")) ) {

										fehlermeldung(node);
									} else if ((calleeObject.name === "$location") && ((calleeProperty.name === "url") || (calleeProperty.name === "path")
											|| (calleeProperty.name === "search") || (calleeProperty.name === "hash") || (calleeProperty.name === "state") || (calleeProperty.name === "replace")) ) {

										// 'replace' ist kein Setter-method, muss trotzdem betrachtet werden
										if ((calleeProperty.name === "replace")) {

											fehlermeldung(node);

										} else {

											if (gparent.arguments.length > 0) {

												fehlermeldung(node);
											}
										}
									}	
								}
							}

							//Bsp: window.location.assign(12);
							if ((ancestors[ancestors.length-3]) && (gparent.type != "CallExpression")) {
								var ggparent = ancestors[ancestors.length-3];
								if (ggparent.type === "CallExpression") {
									if (ggparent.callee.type === "MemberExpression") {
										var gpCalObj = ggparent.callee.object;
										if (gpCalObj) {
											if ((gpCalObj.object) && (gpCalObj.property)) {
												var gpCalObjObj = gpCalObj.object;
												var gpCalObjProp = gpCalObj.property;
												if (((gpCalObjObj.name === "window") && (gpCalObjProp.name === "location"))
														&& ((ggparent.callee.property.name === "assign") || (ggparent.callee.property.name === "replace"))) {

													fehlermeldung(node);
												}
											}
										}
									}
								}
							}
						}

						// Objektzugriff. z.B. a.href = ...
						var name = node.name;
						var parentPropt = parent.property;
						if (parentPropt) {
							var temp = [name, parentPropt.name];
							if (checkArrIsInOtherArr(temp, objectArray)) {
								if (gparent.property != null) {
									fehlermeldung(node);
								} 
							}
						}

						//var object = parent.object;
						var prop = parent.property;

						if ((prop.name === "assign") || (prop.name === "replace")) {

							// Wenn die Var, deren ein Wert zugewiesen wird, bereits defeniert wurde
							if ((vars.indexOf(node.name) > -1)) {

								for (var i = 0; i <= vars.length-1; i++) {
									// Ignoriere Fehler, wenn es ein Objekt mit dem gleichen Namen gibt (fuer die Vereinfachung)
									if ((vars[i] === node.name) /*&& (!checkVarNameEqObjName(node.name, objectArray))*/) {

										if (markiert[i] === true) {

											// Bestimme Namen der Funktionen, die diese var umgeben
											var fktScopes = [];
											for (var j = 0; j <= ancestors.length-1; j++) {


												if (ancestors[j].type === "FunctionDeclaration") {
													var ancestor = ancestors[j];
													var fktId = ancestor.id;
													fktScopes.push(fktId.name);
												}
											}


											// ist wichtig z. B. fuer
											// var a = window.location; function foo() {if(true) {var a = 34;} a = 'foobar.com'; } a = 'hallo'; ,
											// da sonst eine doppelte Fehlermeldung erzeugt wird (siehe Quellcode) -> Fehler in Eslint

											if (!checkScope(node.name, i, fktScopes, fkt, vars)) {

												var defScopes = fkt[i];
												if(isSubset(fktScopes, defScopes)) {

													fehlermeldung(node);
												}
											}

										}  else if(markiert[i] === false){

											var scopes = [];
											for (var j = 0; j <= ancestors.length-1; j++) {

												if(ancestors[j].type === "FunctionDeclaration") {
													var ancestor = ancestors[j];
													var fktId = ancestor.id;
													scopes.push(fktId.name);
												}
											}


											if (!checkScope(node.name, i, scopes, fkt, vars)) {
												if (isSubset(scopes, fkt[i])) {

													if (parent.type === "AssignmentExpression") {
														var index = checkIndex(node.name, i, scopes, fkt, vars)

														var right = parent.right;

														if ((right != null) &&  (right.type === "MemberExpression")) {
															var obj = right.object;
															var prop = right.property;
															var objectName = obj.name;
															var propertyName = prop.name;

															// markiere var, wenn sie den Wert window.location enthaelt
															if (((objectName === "window") || (objectName === "$window")) && (propertyName === "location")) {
																markiert[index] = true;

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
				}
			}
		}
};
