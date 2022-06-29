/**
 * @fileoverview Regel 5.1/5.3: Absolute URLs nicht zugelassen (http://..., https://)
 * 
 * @author Maxim Shulyatev
 */

"use strict";

//------------------------------------------------------------------------------
//Rule Definition
//------------------------------------------------------------------------------

const FEHLERMELDUNG = "Regel 5.1/5.3: Absolute URLs nicht zugelassen";


module.exports = {
		meta: {
			docs: {
				description: "Regel 5.1/5.3: Absolute URLs nicht zugelassen (http://..., https://)",
				category: "FI custom rule"
			},
			schema: [
			         {
			        	 enum: [1, 2, 3, 4, 5, 6, 7]
			         }
			         ] 
		},
		create: function(context) {

			var markiert = [];

			// Konstanten fuer die Auswertung von context.options
			const EINS = ["src"];
			const ZWEI = ["href"];
			const DREI = ["xmlns"];
			const VIER = ["src", "href"];
			const FUENF = ["src", "xmlns"];
			const SECHS = ["xmlns", "href"];
			const SIEBEN = ["src", "href", "xmlns"];


			// meldet Fehler mit einer Verschiebung
			function report(pre, chars, node) {
				context.report({
					node: node,
					loc : { 
						line: node.loc.start.line,
						//Verschiebung um den abgeschnittenen vorne Teil  + Position im String
						column: node.loc.start.column + pre + chars
					},
					message: FEHLERMELDUNG, 
				});
			}

			// einfache Fehlermeldung
			function easyReport(node) {
				context.report({
					node: node,
					message: FEHLERMELDUNG
				});
			}


			function checkSavedVars(node) {
				if (node.parent) {
					var parent = node.parent;
					// Bsp.: var x = "https://"; var y = x + "google.de"; -> Fehlermeldung fuer 'y'
					if (parent.type ===  "BinaryExpression") {
						var parentLeft = parent.left;
						if (parentLeft.type === "Identifier") {
							if (markiert.indexOf(parentLeft.name) != -1) {
								easyReport(node);
							}
						}
					}

					//Bsp.: var url = 'http://..'; '<a href =' + url + '>'  -> fehlermeldung fuer z. B. '<a href = ...'
					if ((parent.type === "BinaryExpression") && (parent.right.type === "Identifier") && (markiert.indexOf(parent.right.name) != -1)) {

						if ((node.value.search(/\b(src)\b/g) != -1)) {
							easyReport(node);

						}
					}
				}
			}

			// prueft andere Faelle
			function checkUrls(protocol, prefixArray, node) {

				// Protokoll wird im Zusammenhang mit '://' betrachtet
				var protocol = protocol + "://";
				var value = node.value;
				var zeichenAbgeschnitten = 0;

				// do-while-Schleife wird benoetigt, damit alle Treffer in einem Literal, das mehrere 'http://' bzw. 'https://' enthaelt,
				// gefunden werden (Literal wird in kleinere Literale aufgeteilt, die jeweils ein einziges 'http://' bzw. 'https://' enthaelten -> abgeschnittene Zeichen)
				do {

					// wenn Literal 'http://' bzw. 'https://' enthaelt
					if (value.toLowerCase().indexOf(protocol) != -1) {

						// speichere die Name der Variable, die 'http' enthaelt;
						// Bsp.: http://localhost/..
						var protocolRegExpr = protocol + "localhost/";

						// Bsp.: http://localhost:8080/
						var protocolRegExpr2 = protocol + "localhost";
						protocolRegExpr2 = protocolRegExpr2 + "(:[0-9]+)*";
						protocolRegExpr2 = protocolRegExpr2 + "/";

						// markiere 'http' und 'https', die kein 'localhost' benutzen
						if(node.parent.type === "VariableDeclarator") {
							if (value.indexOf(protocolRegExpr) === -1 ) {
								if (value.search(protocolRegExpr2) === -1) {
									markiert.push(node.parent.id.name);
								}
							}
						}

						var indexHttp = value.indexOf(protocol);

						// der bis zum 'protoclol' abgeschnitte Teil
						var literalbisHttp = value.substring(0, indexHttp);
						// Positionen der Prefixe, die kurz vor 'protocol' im abgeschniteten String auftauchen koennen
						var locationOfPrefix = [];

						// suche z. B. 'src' oder 'href', die sich möglichst nah zu 'http://' bzw. 'https://' befinden
						for (var i = 0; i < prefixArray.length; i++) {
							locationOfPrefix.push(literalbisHttp.lastIndexOf(prefixArray[i]));
						}



						// pruefe, ob mindestens ein Element aus 'prefixArray' im Literal vorhanden ist (d.h. Position != -1)
						var locOfPrefixIsMinusOne = true;
						for (var k = 0; k < locationOfPrefix.length; k++) {
							if (locationOfPrefix[k] != -1) {
								locOfPrefixIsMinusOne = false;
								break;
							}
						}

						// der einfachste Fall (ohne Leerzeichen), z. B. 'https://hallo.de'
						if ((indexHttp === 0) && (value.indexOf(" ") === -1) && (node.parent.type !== "BinaryExpression")) {

							// Fehlermeldung, wenn es nich durch ein 'localhost' kommuniziert wird
							if (value.indexOf(protocolRegExpr) === -1 ) {
								if (value.search(protocolRegExpr2) === -1) {
									easyReport(node);
								}
							}
						}

						// Bsp.: <script src =' + 'https://www.google.de' + '></script>'
						// nach 'script' mit 'src'- Attribut wird es immer gesucht, unabhaengig von 'prefixArray'; (nur im Zusammenhang mit 'http' bzw. 'https'!)
						// nach <script> ohne 'src' wird es in 'fi-no-scripttag' gesucht
						if ((indexHttp === 0) && (value.indexOf(" ") === -1) && (node.parent.type === "BinaryExpression")) {

							var parent = node.parent;

							// 'ja' zeigt, ob im String vor 'http' ein 'src' steht
							var ja = false;

							// einfaches 'BinaryExpression'
							if ((parent.left.type === "Literal") && ((parent.left.value.search(/\b(src)\b/g) != -1))) {
								ja = true;
							} 

							// zusammengesetztes 'BinaryExpression'
							else if ((parent.parent) && (parent.parent.type === "BinaryExpression") && ((parent.parent.left.type === "BinaryExpression") && (parent.left.type === "BinaryExpression") && (parent.left.left.type === "Literal")  
									&& (parent.left.left.value.search(/\b(src)\b/g) != -1)))  {
								ja = true;
							}	

							// 'src' enthaelten und es wird nicht durch 'localhost' kommuniziert
							if ((ja) && (value.indexOf(protocolRegExpr) === -1)) {
								if (value.search(protocolRegExpr2) === -1) {
									easyReport(node);
								}
							}
						}

						// Anzahl Zeichen. Wenn ein Element aus 'prefixArray' im Literal max. diese Anzahl Zeichen vor 'http://'
						// bzw. vor 'https://' steht, dann wird es angenommen, dass dieses Element sich zum aktuellen 'http://'
						// bzw 'https://' bezieht. Der Wert 10 ist willkuerlich gewaelt!
						var space = 10;

						for (var j = 0; j < locationOfPrefix.length; j++) {

							// 'space' ist z. B. fuer 'xmlns' groesser als z. B. fuer 'src', da nach 'xmlns' noch eine Bezeichnung stehen kann
							if ((prefixArray[j] != "src") || (prefixArray[j] != "href")) {
								space = 25;
							}

							// pruefe ob das j-te Element aus 'prefixArray' kurz vor 'http://' bzw. 'https://' steht. Wenn 'Ja', dann wird eine Fehlermeldung ausgegeben. 
							if ((indexHttp > 0) && (locationOfPrefix[j] != -1) && (locationOfPrefix[j] < indexHttp) && ((indexHttp - locationOfPrefix[j]) < space)) {
								report(locationOfPrefix[j], zeichenAbgeschnitten, node);
							}
							// Wert wird fuer die naechste Runde zurueckgesetzt
							space = 10;
						}

						// pruefe, ob Literal mind. ein Leerzeichen enthaelt
						if(value.indexOf(" ") != -1) {

							var indexOfSearch = value.indexOf(" ");

							// " " vor 'http://' bzw. 'https://' und Elemente aus 'prefixArray'(=> Vermeidung von doppelten Fehlermeldungen) treten nicht auf
							if( ((indexHttp - indexOfSearch) === 1) && (indexOfSearch === 0) && (locOfPrefixIsMinusOne === true)) {

								// pruefe, ob nach URL noch weiteres Text steht
								var newValue = value.substring(1, value.length);

								// suche wieder nach einem Leerzeichen
								var newIndexOfSearch = newValue.indexOf(" ");

								if (newIndexOfSearch != -1) {

									// keine Fehlermeldung, wenn nach URL noch ein Text steht
									// Fehlermeldung, wenn " " das letzte Element im Literal ist und unmittelbar nach Url steht
									if (newIndexOfSearch === newValue.length-1) {
										easyReport(node);
									}

								} else {
									easyReport(node);
								}
							}
						}

						// " " nach 'http://' bzw. 'https://'
						if((indexOfSearch > indexHttp) && (locOfPrefixIsMinusOne === true)) {

							// Fehlermeldung, wenn kein Text nach " "
							if(indexOfSearch === value.length -1) {
								easyReport(node);
							}
						}

						// Literal wird um bis das erse 'http://' bzw. 'https://' verkuertzt
						value = value.substring(indexHttp + 1, value.length);
						// wird um die Anzahl abgeschnittener Zeichen erhoeht
						zeichenAbgeschnitten = zeichenAbgeschnitten + indexHttp;
						indexHttp = value.indexOf(protocol);
					}

				} while (indexHttp > 0);

			}

			return {

				Literal: function(node) {


					// option aus .eslintrc.json
					var options = context.options[0];
					// default options
					var option = ["src", "href", "xmlns"];

					// die Zahlen von 1 bis 7 werden mit dem zugehoerigen Array assoziiert
					switch (options) {
					case 1:
						option = EINS;
						break;
					case 2:
						option = ZWEI;
						break;
					case 3:
						option = DREI;
						break;
					case 4:
						option = VIER;
						break;
					case 5:
						option = FUENF;
						break;
					case 6:
						option = SECHS;
						break;
					case 7:
						option = SIEBEN;
						break;
					}

					// Aufruf der Funktionen
					if (typeof node.value === "string") {

						// Diese Fallunterscheidung ist nur dazu da, 'indexOf' - Aufruf auszuschliessen!
						if ((node.parent) &&  (node.parent.type === "CallExpression") && (node.parent.callee) &&  (node.parent.callee.type === "MemberExpression")) {

							// .indexOf('http://') -Fall wird ausgeschlossen!
							if (node.parent.callee.property.name !== "indexOf") {

								checkUrls("http", option, node);
								checkUrls("https", option, node);
								checkSavedVars(node);
							}

						} else {

							checkUrls("http", option, node);
							checkUrls("https", option, node);
							checkSavedVars(node);
						}
					}
				}
			}
		}
};
