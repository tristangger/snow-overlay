/**
 * @fileoverview Regel 5.1/5.3: Absolute URLs nicht zugelassen (http://..., https://)
 * 
 * 
 * 
 * @author Maxim Shulyatev
 */

"use strict";

//------------------------------------------------------------------------------
//Rule Definition
//------------------------------------------------------------------------------
const FEHLERMELDUNG = "Regel x.y: Einbindung von <script> nicht zugelassen";

module.exports = {
		meta: {
			docs: {
				description: "Regel 5.1/5.3: Absolute URLs nicht zugelassen (http://..., https://)",
				category: "FI custom rule"
			},
			schema: [] // no options
		},
		create: function(context) {

			// meldet Fehler mit Verschiebung
			function report(pre, chars, node) {
				context.report({
					node: node,
					loc : { 
						line: node.loc.start.line,
						column: node.loc.start.column + pre + chars
					},
					message: FEHLERMELDUNG, 
				});
			}

			// meldet einfache Fehler
			function easyReport(node) {
				context.report({
					node: node,
					message: FEHLERMELDUNG
				});
			}

			function checkScript(node) {

				var value = node.value;
				
				// Abgeschnittene Zeichen
				var skipped = 0;
				var index1 = -1;
				var index2 = -1;
				
				do {

					index1 = value.indexOf("<");
					index2 = value.indexOf(">");
					// Betrachte ein Tag
					if (index1 < index2) {

						// String zwischen '<' und '>'
						var substrVor = value.substring(index1 + 1, index2);
						
						if ((index1 > -1) && (index2 < value.length)) {
							
						// gemeint ist z. b '<script>' ohne weitere  Attribute;
						var substrVorUmEinsErweitert = value.substring(index1, index2 + 1);
						}
			
						// 'value' wird um Tag in '<..>' reduziert
						value = value.substring(index2 + 1);

						// wenn dieser Tag 'script' ... 'src' ... '...js' in der richtigen Reihenfolge enthaelt
						if (((substrVor.search(/\b(script)\b/g) > -1) < (substrVor.search(/\b(src)\b/g))) && ((substrVor.search(/\b(src)\b/g)) < (substrVor.search(/[a-zA-Z]+.js\b/))) ) {

							report(substrVor.search(/\b(src)\b/g), skipped, node);
							
							skipped += index2;
							
						// Bsp.: document.write('<script>;
						} if ((substrVorUmEinsErweitert) && (substrVorUmEinsErweitert.indexOf("<script>") > -1) && (node.parent.type === "CallExpression") && (node.parent.callee.type === "MemberExpression")) {
							
							var property = node.parent.callee.property;
							if ((property.name === "createElement") || (property.name === "write") || (property.name === "postMessage")) {
								
								easyReport(node);
							}
						}

					} else {

						// es gibt gar kein '>' in literal --> value ist ein Tag
						if(index2 === -1) {

							if ( ((value.search(/\b(script)\b/g)) < (value.search(/\b(src)\b/g))) && ((value.search(/\b(src)\b/g)) < (value.search(/[a-zA-Z]+.js\b/)))) {

								report(value.search(/\b(src)\b/g), 0, node);
							}

							index2 = -1;

							// '>' steht vor '<' --> '>' wird abgeschnitten
						} else {
							value = value.substring(index2 + 1);
						}
					}

				} while (index2 !== -1);
				
				
				var parent = node.parent;
				
				// Bsp.: document.createElement('script');
				if (((value.search(/\b(script)\b/g) > -1)) && (node.parent.type === "CallExpression") && (node.parent.callee.type === "MemberExpression")) {
					
					var property = node.parent.callee.property;
					
					if ((property.name === "createElement") || (property.name === "write") || (property.name === "postMessage")) {
						
						easyReport(node);
						
					}
				}

				// Bsp.: o.importScript(path + 'data.js') 
				if ((node.value.search(/[a-zA-Z]+.js\b/) > -1) && (parent.type === "BinaryExpression")) {

					if ((parent.parent.type === "CallExpression") && (parent.left.type === "Identifier")) {

						easyReport(node);

						// Bsp.: <script src =' + url +  "datei.js" + '></script>
					} else {

						if((parent.left) && (parent.right) && (parent.left.left) && (parent.left.right) && (parent.left.left.type === "Literal") && (parent.left.right.type === "Identifier")) {

							var left = parent.left.left.value;

							if ((left.search(/\b(src)\b/g) !== -1) || (left.search(/\b(src=)\b/g) !== -1)) {

								easyReport(node);

							}
						}
					}
				}
			}


			return {

				Literal: function(node) {

					if (typeof node.value === "string") {
						checkScript(node);
					}
				}
			};
		}
};
