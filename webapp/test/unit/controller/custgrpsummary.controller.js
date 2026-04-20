/*global QUnit*/

sap.ui.define([
	"com/vcerp/zcustgrpsummary/controller/custgrpsummary.controller"
], function (Controller) {
	"use strict";

	QUnit.module("custgrpsummary Controller");

	QUnit.test("I should test the custgrpsummary controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
