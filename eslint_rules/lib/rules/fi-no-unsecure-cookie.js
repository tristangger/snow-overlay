/**
 * @fileoverview Regel 7.10: Nur Secure-Cookies zugelassen
 * @author Maxim Shulyatev
 */


"use strict";

//------------------------------------------------------------------------------
//Rule Definition
//------------------------------------------------------------------------------
const FEHLERMELDUNG = "Regel 7.10: Nur Secure-Cookies zugelassen";

module.exports = {
		meta: {
			docs: {
				description: "Regel 7.10: Nur Secure-Cookies zugelassen",
				category: "FI custom rule"
			},
			schema: [] // no options
		},

		create: function(context) {

			// speichert Objekte, die ein Property 'secure: true' haben
			var markierteObjekte = [];
			// speichert Identifiers, die in Properties benutzt werden können und deren Wert 'true' ist
			// z. B.  a = true; $.cookie(... { ... secure: a});
			var markierteIdentifiers = [];
			// speichert Identifiers, die Literale mit '; secure' enthalten
			var markierteIdentifiersSecure = [];
			// speichert Identifierts, deren entweder 'document' oder 'window.document' zugewiesen wurde
			var vars = [];


			// zerlegt ein 'BinaryExpression' (argument) in kleinere Teile (Identifiers und Literals).
			// Anschliessend gibt ein Array mit diesen Teilen zurueck
			function zerlegen(binExpr) {

				var left = binExpr.left;
				// right ist nie ein 'BinaryExpression'
				var right = binExpr.right;
				var glieder = [];
				glieder.push(right);

				while(left.type === "BinaryExpression") {
					if (left.left) {
						left = left.left;
					}
					if (left.right) {
						right = left.right;
					}
					glieder.push(right);
				}
				glieder.push(left);

				return glieder;
			}

			return {

				Identifier: function(node) {

					const ancestors = context.getAncestors();
					var parent = ancestors[ancestors.length-1];

					// speichere (alle!) Objekte, die ein 'secure : true' Property haben
					if((parent.init) && (parent.type === "VariableDeclarator") && (parent.init.type === "ObjectExpression")){
						var props = parent.init.properties;
						for (var k = 0; k < props.length; k++) {
							var key = props[k].key.name;
							var value = props[k].value.value;
							if ((key === "secure") && (value === true)) {
								markierteObjekte.push(node.name);
								break;
							}
						}
					}

					// betrachte var x = ... oder x = ... 
					if ( ((parent.init) && (parent.type === "VariableDeclarator") && (parent.init.type === "Literal")) 
							|| ((parent.right) && (parent.right.type === "Literal") && (parent.type === "AssignmentExpression")) ){

						// var x = ...
						if (parent.type === "VariableDeclarator") {

							// Betrachte rechte Seite
							// var x = boolischer Wert
							if(parent.init.value === true) {
								markierteIdentifiers.push(node.name);

							}
							// var x = Literal
							var parentVal = parent.init.value;
							if (typeof parentVal === 'string') {
								if((parentVal.indexOf("; secure") != -1) || (parentVal.indexOf(";secure") != -1)) {
									markierteIdentifiersSecure.push(node.name);
								}
							}
						}

						// x = ...
						if (parent.type === "AssignmentExpression") {
							// var x = boolischer Wert
							if(parent.right.value === true) {
								markierteIdentifiers.push(node.name);
							}
							
							// var x = Literal
							var parentVal = parent.right.value;
							if (typeof parentVal === 'string') {
								if((parentVal.indexOf("; secure") != -1) || (parentVal.indexOf(";secure") != -1)) {
									markierteIdentifiersSecure.push(node.name);
								}
							}
						}
					}

					// Betrachte z. B. var x = 'hallo' + y. Ziel: enthaelt x ';secure' ?
					if((parent.init) && (parent.type === "VariableDeclarator") && (parent.init.type === "BinaryExpression")){

						var elemente = zerlegen(parent.init);
						
						// markiert, ob ein Identifier x ';secure' enthaelt
						var ja = false;

						for (var t = 0; t < elemente.length; t++) {
							var element = elemente[t];

							// untersuche Literale
							if((element.type === "Literal") && (element.value != "")) {
								if (typeof element.value === "string") {
									if((element.value.lastIndexOf(";secure") != -1) || (element.value.lastIndexOf("; secure") != -1)) {
										ja = true;
										break;
									}
								}
							}

							// untersuche Identifiers
							if (element.type === "Identifier") {
								if (markierteIdentifiersSecure.lastIndexOf(element.name) != -1) {
									ja = true;
									break;
								}
							}
						}
						
						// wenn ja === true, dann wird x gespeichert (interessiert uns weiter)
						if(ja) {
							markierteIdentifiersSecure.push(node.name);
						}
					}

					// Bsp.: var cookieProperties = { path: '/' , HttpOnly:true, secure:true}; cookieProperties.secure = false; 
					if((parent.parent) && (node.name === "secure") 
							&& (parent.parent.type === "AssignmentExpression") && (parent.parent.left.type === "MemberExpression")) {

						if (markierteObjekte.lastIndexOf(parent.object.name) !== -1) {
							if ((parent.parent.right) && (parent.parent.right.type === "Literal")) {
								
								// property 'secure: true' wird auf 'secure: false' geaendert
								if (parent.parent.right.value === false) {
									var index = markierteObjekte.lastIndexOf(parent.object.name);
									markierteObjekte.splice(index, 1);
								}
							}
						}
					}

					
					if ((markierteIdentifiers.lastIndexOf(node.name) != -1) 
							&& (parent.type === "AssignmentExpression") && (parent.right.type === "Literal") ) {
						
						// wenn 'var x = true' auf 'x = false' geaendert wird
						if (parent.right.value === false) {
							var index = markierteIdentifiers.lastIndexOf(node.name);
							markierteIdentifiers.splice(index, 1);
						}
						
						// wenn ein 'var x' nicht gleich 'true' war aber jetzt der Wert 'true' zugewiesen wird
						// x wird gespeichert
						if (parent.right.value === true) {
							markierteIdentifiers.push(node.name);
						}
					}

					// speichere vars, deren 'document' bzw.  'window.document' zugewiesen wurde
					if (node.name === "document") {

						// Bsp.: var x = document;
						if (parent.type === "VariableDeclarator") {
							if ((parent.id) && (parent.id.type == "Identifier")) {
								vars.push(parent.id.name);
							}

							// Bsp.: x = document;
						} else if (parent.type === "AssignmentExpression") {
							if ((parent.left) && (parent.right) && (parent.right.type === "Identifier") && (parent.right.name === "document")) {
								vars.push(parent.left.name);
							}

							// Bsp.: var x = window.document;
						} else if ((parent.parent) && (parent.type === "MemberExpression") && (parent.parent.type === "VariableDeclarator")) {
							if ((parent.object.name === "window") && (parent.property.name === "document")) {
								if (parent.parent.id) {
									vars.push(parent.parent.id.name);
								}
							}

							// Bsp.: x = window.location; 
						} else if ((parent.parent) && (parent.type === "MemberExpression") && (parent.parent.type === "AssignmentExpression")) {
							if ((parent.object.name === "window") && (parent.property.name === "document")) {
								if (parent.parent.left) {
									vars.push(parent.parent.left.name);
								}
							}
						}
					}


					/*								
					 * *************************************
					 * ****EIGENTLICHE FUNKTIONALITAET******
					 * *************************************
					 */

					if ((node.name == 'cookie')) {

						var gparent = "";
						if(ancestors.length >= 2) {
							gparent = ancestors[ancestors.length-2]; 
						}

						// direkte Zuweisung
						// Bsp.: document.cookie = 'username=John Doe; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/';
						// oder  var b = document; b.cookie = 'username=John Doe; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/';
						if (((parent.type == 'MemberExpression') && (gparent.type == 'AssignmentExpression') && (((parent.object.type === "Identifier") && (parent.object.name === "document")) || (vars.indexOf(parent.object.name) !== -1 )))){

							// Bsp.: 'username=John Doe; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/';
							var rightside = gparent.right;
							if (rightside.type === 'Literal') {
								var rightvalue = rightside.value;
								// 'secure' nicht vorhanden 
								if (rightvalue.lastIndexOf("secure") === -1) {
									context.report({
										node: node,
										message: FEHLERMELDUNG
									});
								}
							}	

							//Bsp.: document.cookie = x; 
							if (rightside.type === 'Identifier') {
								if (markierteIdentifiersSecure.lastIndexOf(rightside.name) === -1) {
									context.report({
										node: node,
										message: FEHLERMELDUNG
									});
								}
							}

							//Bsp.: document.cookie = x + "expires=Thu, 18 Dec 2013 12:00:00 UTC;" + y; 
							if (rightside.type === 'BinaryExpression') {

								// nur die linke Seite wird zerlegt, rechts steht nie ein 'BinaryExpression'!
								// einzelne Teile sind dann 'Literals' sowie 'Identifiers'
								var members = zerlegen(rightside);
								
								// markiert, ob 'secure' enthaelten ist (in irgendeinem Teil vom 'BinaryExpression')
								var ok = false;
								for (var i = 0; i < members.length; i++) {
									var member = members[i];
									
									// untersuche Literals
									if((member.type === "Literal") && (member.value != "")) {
										if((member.value.indexOf(";secure") != -1) || (member.value.indexOf("; secure") != -1)) {
											ok = true;
											break;
										}
									}
									
									// untersuche Identifiers
									if (member.type === "Identifier") {
										if (markierteIdentifiersSecure.lastIndexOf(member.name) != -1) {
											ok = true;
											break;
										}
									}
								}

								// kein teil vom 'BinaryExpression' enthaelt 'secure'
								if(!ok) {
									context.report({
										node: node,
										message: FEHLERMELDUNG
									});
								}
							}

							// Bsp.: var abc = []; ... abc.push("path=.."); ... document.cookie = abc.join("; ");
							// Es wird davon ausgegangen, dass '; secure' nicht immer im Array enthaelten ist
							if (rightside.type === "CallExpression") {

								if ((rightside.callee) && (rightside.callee.type === "MemberExpression")) {

									if (rightside.callee.property.name === "join") {

										context.report({
											node: node,
											message: FEHLERMELDUNG
										});

									}
								}
							}
						} 

						// Bsp.: window.document.cookie = ...
						if ((parent.type == 'MemberExpression') && (gparent.type == 'AssignmentExpression') && (parent.object.type === "MemberExpression")) {

							var object = node.parent.object;

							if (((object.object.type === "Identifier") && (object.object.name === "window")) && (object.property.name === "document")) {

								var rightside = gparent.right;
								if (rightside.type === 'Literal') {
									var rightvalue = rightside.value;
									// 'secure' nicht vorhanden 
									if (rightvalue.lastIndexOf("secure") === -1) {
										context.report({
											node: node,
											message: FEHLERMELDUNG
										});
									}
								}	
							}
						}

						// Bsp.: $.cookie('measuresData', JSON.stringify(moderniCookie), { path: '/' });
						if ((parent.type === 'MemberExpression') && (gparent.type === 'CallExpression')
								&& (parent.object) && (parent.object.type === "Identifier") && ((parent.object.name === "$") || (parent.object.name === "jQuery"))) {

							// 'secure' kann nur in {}-Teil gesetzt werden ({} ist das 3. Argument)
							if((gparent.arguments.length === 3)) {

								// markiert, ob {} enthaelt
								var testSecure = false;
								// Object ( {} )
								var args = gparent.arguments[2];
								// Uns interessiert, ob in { path: '/' } 'secure' auf 'true' gesetzt wird
								if((args.type === "ObjectExpression")) {
									var propLength = args.properties.length;
									// Untersuche alle Properties von var 'args' vom Typ 'Object'
									for(var i = 0; i < propLength; i++) {
										var argsProp = args.properties[i];
										if(argsProp.type === "Property") {
											var key = argsProp.key.name;
											var value = "";

											// Unterscheidung zwischen 'secure: true' und 'secure: x'
											if (argsProp.value.type === "Identifier") {
												value = argsProp.value.name;
											}
											if (argsProp.value.type === "Literal") {
												value = argsProp.value.value;
											}

											if ((key === "secure") && (argsProp.value.type === "Literal") && (value === true)) {
												testSecure = true; 
											}
											if((key === "secure") && (argsProp.value.type === "Identifier") && (markierteIdentifiers.lastIndexOf(value) != -1)) {
												testSecure = true; 
											}
										}
									}

									// Fehlermeldung, wenn 'secure: true' nicht vorhanden oder 'secure: false'
									if (!testSecure) {
										context.report({
											node: node,
											message: FEHLERMELDUNG
										});
									}	
								} 

								// cookieProperties werden als Object in $.cookie gesetzt
								// Bsp.: var cookieProperties = { path: '/' , HttpOnly:true, secure:true}; $.cookie('measuresData', 'value', cookieProperties);	
								if (args.type === "Identifier") {
									if(markierteObjekte.lastIndexOf(args.name) === -1) {
										context.report({
											node: node,
											message: FEHLERMELDUNG
										});
									}
								}

								// was anderes, z. B. ein Literal 
								if((args.type != "Identifier") && (args.type != "ObjectExpression")) {
									context.report({
										node: node,
										message: FEHLERMELDUNG
									});
								}

							} else {

								// Cookies werden gelesen
								if ((gparent.arguments.length != 1)) {
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
};

