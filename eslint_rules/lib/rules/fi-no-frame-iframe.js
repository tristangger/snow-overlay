/**
 * @fileoverview Regel 8.11: Verwendung von frame und iframe sind nicht erlaubt 
 * @author Maxim Shulyatev
 * 
 * TODO
 */

"use strict";

//------------------------------------------------------------------------------
//Rule Definition
//------------------------------------------------------------------------------
const FEHLERMELDUNG = "Regel 8.11: <frame> und <iframe> nicht zugelassen";


module.exports = {
		meta: {
			docs: {
				description: "Regel 8.11: <frame> und <iframe> nicht zugelassen",
				category: "FI custom rule"
			},
			schema: [] // no options
		},
		create: function(context) {

			return {

				Literal: function(node) {

					var value = node.value;
					var ancestors = context.getAncestors();
					var parent = ancestors[ancestors.length-1];
					var gparent = ancestors[ancestors.length-2]; 
					var parentType = parent.type;
					var gparentType = gparent.type;

					if (typeof value === "string") {

						// Bsp.: $('<iframe src="http://google.com" frameborder="0" scrolling="no" id="myFrame"></iframe>').appendTo('.accordion');
						if ((value.toLowerCase().indexOf("<iframe") != -1) || (value.toLowerCase().indexOf("<frame") != -1) )	 {

							context.report({
								node: node,
								message: FEHLERMELDUNG	        		   
							});
						} 

						else if (((value.toLowerCase().indexOf("iframe") > -1) || (value.toLowerCase().indexOf("frame") > -1)) &&
								(parentType === "CallExpression")) {

							var parentCallee = parent.callee;

							// Bsp.: $('<iframe src="http://google.com" frameborder="0" scrolling="no" id="myFrame"></iframe>').appendTo('.accordion');
							if ((parentCallee.type === "Identifier") && ((parentCallee.name ==="$") || (parentCallee.name ==="jQuery") || (parentCallee.name.indexOf("create") !== -1) )) { 

								if ((node.value.toLowerCase() === "iframe") || (node.value.toLowerCase() === "frame")) {
									context.report({
										node: node,
										message: FEHLERMELDUNG		   
									});
								} 
							}

							//Bsp.: var iframe = __webpack_require__(15)('iframe');
							if ((parentCallee.type === "CallExpression")) {

								if ((parentCallee.callee) && (parentCallee.callee.type === "Identifier") && (parentCallee.callee.name.indexOf("webpack") !== -1))
									context.report({
										node: node,
										message: FEHLERMELDUNG		   
									});
							}

							// .find(), .createElement() usw..
							if (parentCallee.type === "MemberExpression") {

								if ((node.value.toLowerCase() === "iframe") || (node.value.toLowerCase() === "frame")) {
									// genau ein Argument
									if (parent.arguments.length === 1) {
										// Bsp.:  this.getCookie('wt_overlayFrame');
										// 'craete' ist eine Beschraenkung!
										if ((parentCallee.property) && (parentCallee.property.name.indexOf("create") !== -1 )) {
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
