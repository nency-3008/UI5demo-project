
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/plugins/CellSelector",
    "sap/m/plugins/CopyProvider",
    "sap/ui/export/Spreadsheet",
    "com/vcerp/zcustgrpsummary/utils/formatter",
    "sap/ui/model/json/JSONModel"
], (Controller, Filter, FilterOperator, MessageToast, CellSelector, CopyProvider, Spreadsheet, formatter, JSONModel) => {
    "use strict";

    return Controller.extend("com.vcerp.zcustgrpsummary.controller.custgrpsummary", {
        formatter: formatter,
        onInit() {
            this.setDefaultDateRange();
            this._originalData = null;
            var oUnitModel = new JSONModel({
                selectedUnit: "LACS"
            });
            this.getView().setModel(oUnitModel, "unitModel");
        },

        onUnitChange: function (oEvent) {
            // SegmentedButton selectionChange provides 'key' (and older might provide item)
            var sKey = oEvent.getParameter("key") ||
                (oEvent.getParameter("item") && oEvent.getParameter("item").getKey && oEvent.getParameter("item").getKey());

            console.log("onUnitChange fired, selected key:", sKey);

            if (!sKey) { return; }

            var oUnitModel = this.getView().getModel("unitModel");
            oUnitModel.setProperty("/selectedUnit", sKey);
        },




            setDefaultDateRange: function () {
                var oDateRangeSelection = this.byId("DRS1");
                var oToday = new Date();

                // Get first day of current month
                var oFirstDay = new Date(oToday.getFullYear(), oToday.getMonth(), 1);

                // Set the date range: first day of month to today
                oDateRangeSelection.setDateValue(oFirstDay);
                oDateRangeSelection.setSecondDateValue(oToday);
            },

            _getMultiComboBoxFilters: function (sMCBId, sProperty) {
                var oMCB = this.byId(sMCBId);
                var aKeys = oMCB.getSelectedKeys();
                if (!aKeys || aKeys.length === 0) return [];

                var aFilters = aKeys.map(function (sKey) {
                    return new Filter(sProperty, FilterOperator.EQ, sKey);
                });

                return aFilters;
            },



            onFilterSearch: function () {
                var that = this;
                var oModel = this.getOwnerComponent().getModel();

                var oDateRangeSelection = this.byId("DRS1");
                var oFromDate = oDateRangeSelection.getDateValue();
                var oToDate = oDateRangeSelection.getSecondDateValue();

                console.log("UI From Date:", oFromDate);
                console.log("UI To Date:", oToDate);


                if (!oFromDate || !oToDate) {
                    sap.m.MessageToast.show("Please select both From and To dates");
                    return;
                }

                var oFilterFromDate = new Date(Date.UTC(oFromDate.getFullYear(), oFromDate.getMonth(), oFromDate.getDate(), 0, 0, 0, 0));
                var oFilterToDate = new Date(Date.UTC(oToDate.getFullYear(), oToDate.getMonth(), oToDate.getDate(), 0, 0, 0, 0));

                var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "yyyy-MM-dd'T'HH:mm:ss"
                });

                var sFromDate = oDateFormat.format(oFilterFromDate);
                var sToDate = oDateFormat.format(oFilterToDate);

                console.log("Formatted FromDate:", sFromDate, "ToDate:", sToDate);
                console.log("Filter FromDate Object:", oFilterFromDate);
                console.log("Filter ToDate Object:", oFilterToDate);

                var aFilters = [
                    new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.GE, sFromDate),
                    new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.LE, sToDate)
                ];
                var aDivisionFilters = this._getMultiComboBoxFilters("divisionMCB", "Spart");
                var aDivisionGroupFilters = this._getMultiComboBoxFilters("divisionGroupMCB", "ZdivGrp");
                var aDistributionChannelFilters = this._getMultiComboBoxFilters("distChannelMCB", "Vtweg");


                aFilters = aFilters.concat(aDivisionFilters, aDivisionGroupFilters, aDistributionChannelFilters);





                oModel.read("/CustGrpSet", {
                    filters: aFilters,
                    success: function (oData) {
                        console.log("Data received:", oData.results);
                        that._originalData = JSON.parse(JSON.stringify(oData.results));
                        var oHeaderModel = new sap.ui.model.json.JSONModel();
                        oHeaderModel.setData(oData.results);
                        that.getView().setModel(oHeaderModel, "CustGrpModel");
                    },
                    error: function (oError) {
                        console.error("Error reading data:", oError);
                    },
                });
            },



            exportToExcel: function (sTableId, aColumns, sFileName, sModelName) {
                var oTable = this.byId(sTableId);
                if (!oTable) {
                    sap.m.MessageToast.show("Table not found for export");
                    return;
                }

                var oModel = this.getView().getModel(sModelName);
                if (!oModel || !oModel.getData()) {
                    sap.m.MessageToast.show("No data available for export");
                    return;
                }

                var aData = oModel.getData();
                // If data is under /results (like OData read), normalize it
                if (aData.results) {
                    aData = aData.results;
                }

                var oSettings = {
                    workbook: {
                        columns: aColumns
                    },
                    dataSource: aData,
                    fileName: sFileName,
                    fileType: "xlsx"
                };

                var oSheet = new sap.ui.export.Spreadsheet(oSettings);
                oSheet.build()
                    .then(function () {
                        sap.m.MessageToast.show("Excel exported successfully");
                    })
                    .catch(function (oError) {
                        console.error("Error during Excel export:", oError);
                        sap.m.MessageToast.show("Export failed");
                    })
                    .finally(function () {
                        oSheet.destroy();
                    });
            },



            onExportExcel1: function () {
                this.exportToExcel("productTable", [
                    { label: "Customer Group", property: "KdgrpAuft" },
                    { label: "Customer Group Name", property: "Custgrpdesc" },
                    { label: "Sales", property: "Netwr" },
                    { label: "All claims", property: "Allclaim" },
                    { label: "Net of all claims amt", property: "Netallclaim" },
                    { label: "Last month sales", property: "LastMonSales" }
                ], "CustomerGroupData.xlsx", "CustGrpModel");
            },

            onExportExcel2: function () {
                this.exportToExcel("salesOfficeTable", [
                    { label: "Sales Office", property: "Vkbur" },
                    { label: "Description", property: "Soffdesc" },
                    { label: "Sales", property: "Netwr" },
                    { label: "All claims", property: "Allclaim" },
                    { label: "Net of all claims amt", property: "Netallclaim" },
                    { label: "Last month sales", property: "LastMonSales" }
                ], "SalesOfficeData.xlsx", "CustSaleModel");
            },

            onExportExcel3: function () {
                this.exportToExcel("salesGroupTable", [
                    { label: "Sales Group", property: "Vkgrp" },
                    { label: "Sales Group Name", property: "Sgrpdesc" },
                    { label: "Sales", property: "Netwr" },
                    { label: "All claims", property: "Allclaim" },
                    { label: "Net of all claims amt", property: "Netallclaim" },
                    { label: "Last month sales", property: "LastMonSales" }
                ], "SalesGroupData.xlsx", "CustSalesGrpModel");
            },

            onExportExcel4: function () {
                this.exportToExcel("customerDetails", [
                    { label: "Customer Code", property: "Kunag" },
                    { label: "Customer Code Name", property: "Name1" },
                    { label: "Sales", property: "Netwr" },
                    { label: "All claims", property: "Allclaim" },
                    { label: "Net of all claims amt", property: "Netallclaim" },
                    { label: "Last month sales", property: "LastMonSales" }
                ], "CustomerDetails.xlsx", "CustModel");
            },


            onCopyPress: function () {
                var oTable = this.byId("productTable");


                var aSelectedIndices = oTable.getSelectedIndices();

                if (!aSelectedIndices || aSelectedIndices.length === 0) {
                    sap.m.MessageToast.show("Please select at least one row to copy");
                    return;
                }

                var aTextRows = [];


                for (var i = 0; i < aSelectedIndices.length; i++) {
                    var oContext = oTable.getContextByIndex(aSelectedIndices[i]);
                    if (!oContext) continue;

                    var oRow = oContext.getObject();
                    if (!oRow) continue;

                    aTextRows.push([
                        oRow.KdgrpAuft || "",
                        oRow.Custgrpdesc || "",
                        oRow.Netwr || "",
                        oRow.Allclaim || "",
                        oRow.Netallclaim || "",
                        oRow.LastMonSales || ""
                    ].join("\t"));
                }

                var sText = aTextRows.join("\n");


                navigator.clipboard.writeText(sText).then(function () {
                    sap.m.MessageToast.show("Copied " + aTextRows.length + " row(s) to clipboard");
                }).catch(function () {
                    sap.m.MessageToast.show("Failed to copy");
                });
            },





            onCopyPress2: function () {
                var oTable = this.byId("salesOfficeTable");


                var aSelectedIndices = oTable.getSelectedIndices();

                if (!aSelectedIndices || aSelectedIndices.length === 0) {
                    sap.m.MessageToast.show("Please select at least one row to copy");
                    return;
                }

                var aTextRows = [];


                for (var i = 0; i < aSelectedIndices.length; i++) {
                    var oContext = oTable.getContextByIndex(aSelectedIndices[i]);
                    if (!oContext) continue;

                    var oRow = oContext.getObject();
                    if (!oRow) continue;

                    aTextRows.push([
                        oRow.Vkbur || "",
                        oRow.Soffdesc || "",
                        oRow.Netwr || "",
                        oRow.Allclaim || "",
                        oRow.Netallclaim || "",
                        oRow.LastMonSales || ""
                    ].join("\t"));
                }

                var sText = aTextRows.join("\n");


                navigator.clipboard.writeText(sText).then(function () {
                    sap.m.MessageToast.show("Copied " + aTextRows.length + " row(s) to clipboard");
                }).catch(function () {
                    sap.m.MessageToast.show("Failed to copy");
                });
            },



            onCopyPress3: function () {
                var oTable = this.byId("salesGroupTable");


                var aSelectedIndices = oTable.getSelectedIndices();

                if (!aSelectedIndices || aSelectedIndices.length === 0) {
                    sap.m.MessageToast.show("Please select at least one row to copy");
                    return;
                }

                var aTextRows = [];


                for (var i = 0; i < aSelectedIndices.length; i++) {
                    var oContext = oTable.getContextByIndex(aSelectedIndices[i]);
                    if (!oContext) continue;

                    var oRow = oContext.getObject();
                    if (!oRow) continue;

                    aTextRows.push([
                        oRow.Vkgrp || "",
                        oRow.Sgrpdesc || "",
                        oRow.Netwr || "",
                        oRow.Allclaim || "",
                        oRow.Netallclaim || "",
                        oRow.LastMonSales || ""
                    ].join("\t"));
                }

                var sText = aTextRows.join("\n");


                navigator.clipboard.writeText(sText).then(function () {
                    sap.m.MessageToast.show("Copied " + aTextRows.length + " row(s) to clipboard");
                }).catch(function () {
                    sap.m.MessageToast.show("Failed to copy");
                });
            },




            onCopyPress4: function () {
                var oTable = this.byId("customerDetails");


                var aSelectedIndices = oTable.getSelectedIndices();

                if (!aSelectedIndices || aSelectedIndices.length === 0) {
                    sap.m.MessageToast.show("Please select at least one row to copy");
                    return;
                }

                var aTextRows = [];


                for (var i = 0; i < aSelectedIndices.length; i++) {
                    var oContext = oTable.getContextByIndex(aSelectedIndices[i]);
                    if (!oContext) continue;

                    var oRow = oContext.getObject();
                    if (!oRow) continue;

                    aTextRows.push([
                        oRow.Kunag || "",
                        oRow.Name1 || "",
                        oRow.Netwr || "",
                        oRow.Allclaim || "",
                        oRow.Netallclaim || "",
                        oRow.LastMonSales || ""
                    ].join("\t"));
                }

                var sText = aTextRows.join("\n");


                navigator.clipboard.writeText(sText).then(function () {
                    sap.m.MessageToast.show("Copied " + aTextRows.length + " row(s) to clipboard");
                }).catch(function () {
                    sap.m.MessageToast.show("Failed to copy");
                });
            },




            onCustGroupPress: function (oEvent) {
                var oContext = oEvent.getSource().getBindingContext("CustGrpModel");
                var sCustGroup = oContext.getProperty("KdgrpAuft");
                this._sSelectedCustGroup = oContext.getProperty("KdgrpAuft");

                var oDateRangeSelection = this.byId("DRS1");
                var oFromDate = oDateRangeSelection.getDateValue();
                var oToDate = oDateRangeSelection.getSecondDateValue();

                if (!oFromDate || !oToDate) {
                    sap.m.MessageToast.show("Please select date range");
                    return;
                }

                var oFilterFromDate = new Date(Date.UTC(oFromDate.getFullYear(), oFromDate.getMonth(), oFromDate.getDate(), 0, 0, 0, 0));
                var oFilterToDate = new Date(Date.UTC(oToDate.getFullYear(), oToDate.getMonth(), oToDate.getDate(), 0, 0, 0, 0));

                var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "yyyy-MM-dd'T'HH:mm:ss"
                });

                var sFromDate = oDateFormat.format(oFilterFromDate);
                var sToDate = oDateFormat.format(oFilterToDate);

                var oModel = this.getView().getModel(); // OData model

                oModel.read("/CustSaleOffSet", {
                    filters: [
                        new sap.ui.model.Filter("KdgrpAuft", sap.ui.model.FilterOperator.EQ, this._sSelectedCustGroup),
                        new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.GE, sFromDate),
                        new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.LE, sToDate)
                    ],
                    success: function (oData) {
                        console.log("Sales office data:", oData.results);

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData({ results: oData.results });

                        this.getView().setModel(oJSONModel, "CustSaleModel");

                        this.byId("salesOfficeTable").setVisible(true);
                        this.byId("productTable").setVisible(false);


                        this.byId("custGroupLink").setText("Customer Group>>" + sCustGroup);
                        this.setFilterBarState(false);

                    }.bind(this),
                    error: function () {
                        sap.m.MessageToast.show("Error loading sales office data");
                    }
                });
            },


            onBackPress: function () {
                this.byId("salesOfficeTable").setVisible(false);
                this.byId("productTable").setVisible(true);

                this.setFilterBarState(true); 
            },





            onSalesOfficePress: function (oEvent) {
                var oContext = oEvent.getSource().getBindingContext("CustSaleModel");

                this._sVkbur = oContext.getProperty("Vkbur");

                var sCustGroup = this._sSelectedCustGroup;
                // var sCustGroup = oContext.getProperty("KdgrpAuft");

                console.log("Context properties:", oContext.getObject());

                var oDateRangeSelection = this.byId("DRS1");
                var oFromDate = oDateRangeSelection.getDateValue();
                var oToDate = oDateRangeSelection.getSecondDateValue();

                if (!oFromDate || !oToDate) {
                    sap.m.MessageToast.show("Please select date range");
                    return;
                }

                var oFilterFromDate = new Date(Date.UTC(oFromDate.getFullYear(), oFromDate.getMonth(), oFromDate.getDate(), 0, 0, 0, 0));
                var oFilterToDate = new Date(Date.UTC(oToDate.getFullYear(), oToDate.getMonth(), oToDate.getDate(), 0, 0, 0, 0));

                var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "yyyy-MM-dd'T'HH:mm:ss"
                });

                var sFromDate = oDateFormat.format(oFilterFromDate);
                var sToDate = oDateFormat.format(oFilterToDate);

                var oModel = this.getView().getModel();

                oModel.read("/CustSaleGrpSet", {
                    filters: [
                        new sap.ui.model.Filter("KdgrpAuft", sap.ui.model.FilterOperator.EQ, sCustGroup),
                        new sap.ui.model.Filter("Vkbur", sap.ui.model.FilterOperator.EQ, this._sVkbur),
                        new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.GE, sFromDate),
                        new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.LE, sToDate)
                    ],
                    success: function (oData) {
                        console.log("Sales group data:", oData.results);

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData({ results: oData.results });

                        this.getView().setModel(oJSONModel, "CustSalesGrpModel");

                        this.byId("salesGroupTable").setVisible(true);
                        this.byId("salesOfficeTable").setVisible(false);


                        this.byId("SalesOffice").setText("Sales Office>>" + this._sVkbur);
                        this.setFilterBarState(false);

                    }.bind(this),
                    error: function () {
                        sap.m.MessageToast.show("Error loading sales group data");
                    }
                });
            },

            onBackPress2: function () {
                this.byId("salesGroupTable").setVisible(false);
                this.byId("salesOfficeTable").setVisible(true);


            },



            onSaleGroupPress: function (oEvent) {
                var oContext = oEvent.getSource().getBindingContext("CustSalesGrpModel");
                var sVkbur = this._sVkbur;
                var sVkgrp = oContext.getProperty("Vkgrp");

                var sCustGroup = this._sSelectedCustGroup;
                // var sCustGroup = oContext.getProperty("KdgrpAuft");

                console.log("Context properties:", oContext.getObject());

                var oDateRangeSelection = this.byId("DRS1");
                var oFromDate = oDateRangeSelection.getDateValue();
                var oToDate = oDateRangeSelection.getSecondDateValue();

                if (!oFromDate || !oToDate) {
                    sap.m.MessageToast.show("Please select date range");
                    return;
                }

                var oFilterFromDate = new Date(Date.UTC(oFromDate.getFullYear(), oFromDate.getMonth(), oFromDate.getDate(), 0, 0, 0, 0));
                var oFilterToDate = new Date(Date.UTC(oToDate.getFullYear(), oToDate.getMonth(), oToDate.getDate(), 0, 0, 0, 0));

                var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "yyyy-MM-dd'T'HH:mm:ss"
                });

                var sFromDate = oDateFormat.format(oFilterFromDate);
                var sToDate = oDateFormat.format(oFilterToDate);

                var oModel = this.getView().getModel();

                oModel.read("/CustCodeSet", {
                    filters: [
                        new sap.ui.model.Filter("KdgrpAuft", sap.ui.model.FilterOperator.EQ, sCustGroup),
                        new sap.ui.model.Filter("Vkbur", sap.ui.model.FilterOperator.EQ, sVkbur),
                        new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.GE, sFromDate),
                        new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.LE, sToDate),
                        new sap.ui.model.Filter("Vkgrp", sap.ui.model.FilterOperator.EQ, sVkgrp),
                    ],
                    success: function (oData) {
                        console.log("Sales group data:", oData.results);

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData({ results: oData.results });

                        this.getView().setModel(oJSONModel, "CustModel");

                        this.byId("customerDetails").setVisible(true);
                        this.byId("salesGroupTable").setVisible(false);


                        this.byId("SalesGroup").setText("SalesGroup>>" + sVkgrp);
                        this.setFilterBarState(false);

                    }.bind(this),
                    error: function () {
                        sap.m.MessageToast.show("Error loading sales group data");
                    }
                });
            },

            onBackPress4: function () {
                this.byId("customerDetails").setVisible(false);
                this.byId("salesGroupTable").setVisible(true);
            },

            onEyePress1: function (oEvent) {
                var oSource = oEvent.getSource();
                var oContext = oSource.getBindingContext("CustGrpModel") || oSource.getBindingContext("CustModel");
                var oData = oContext.getObject();
                this.byId("dlgKdgrpAuft").setValue(oData.KdgrpAuft || "");
                this.byId("dlgCustgrpdesc").setValue(oData.Custgrpdesc || "");
                this.byId("dlgNetwr").setValue(String(oData.Netwr || ""));
                this.byId("dlgAllclaim").setValue(String(oData.Allclaim || ""));
                this.byId("dlgNetallclaim").setValue(String(oData.Netallclaim || ""));
                this.byId("dlgLastMonSales").setValue(String(oData.LastMonSales || ""));
                this.byId("customerDetailDialog").open();
            },

            onCloseDialog: function () {
                this.byId("customerDetailDialog").close();
            },


            setFilterBarState: function (bEnable) {
                this.byId("DRS1").setEnabled(bEnable);
                this.byId("divisionMCB").setEnabled(bEnable);
                this.byId("divisionGroupMCB").setEnabled(bEnable);
                this.byId("distChannelMCB").setEnabled(bEnable);
            },





        });
})







// sap.ui.define([
//     "sap/ui/core/mvc/Controller",
//     "sap/ui/model/Filter",
//     "sap/ui/model/FilterOperator",
//     "sap/m/MessageToast",
//     "sap/m/plugins/CellSelector",
//     "sap/m/plugins/CopyProvider"
// ], (Controller, Filter, FilterOperator, MessageToast, CellSelector, CopyProvider) => {
//     "use strict";

//     return Controller.extend("com.vcerp.zcustgrpsummary.controller.custgrpsummary", {
//         onInit() {
//             this.setDefaultDateRange();
//             // if (window.isSecureContext) {
//             //     const oTable = this.byId("productTable");
//             //     const oToolbar = this.byId("productTableToolbar"); 

//             //     if (oTable && oToolbar) {

//             //         const oCellSelector = new sap.m.plugins.CellSelector();
//             //         oTable.addDependent(oCellSelector);

//             //         const oCopyProvider = new sap.m.plugins.CopyProvider({
//             //             extractData: this.extractData,
//             //             copy: this.onCopyPress.bind(this)
//             //         });
//             //         oTable.addDependent(oCopyProvider);


//             //         oToolbar.addContent(oCopyProvider.getCopyButton());
//             //     }
//             // }


//             if (window.isSecureContext) {
//                 this.addCopySupport("productTable", "productTableToolbar");
//                 this.addCopySupport("salesOfficeTable", "salesOfficeTableToolbar");
//                 this.addCopySupport("salesGroupTable", "salesGroupTableToolbar");
//                 this.addCopySupport("customerDetails", "customerDetailsToolbar");
//             }

//         },


//         onShowSalesOfficeTable: function () {
//             const oTable = this.byId("salesOfficeTable");
//             oTable.setVisible(true);

//             if (!oTable._copySupportAdded) {
//                 oTable.addEventDelegate({
//                     onAfterRendering: () => {
//                         this.addCopySupport("salesOfficeTable", "salesOfficeTableToolbar");
//                     }
//                 });
//                 oTable._copySupportAdded = true;
//             }
//         },


//         addCopySupport: function (sTableId, sToolbarId) {
//             const oTable = this.byId(sTableId);
//             const oToolbar = this.byId(sToolbarId);

//             if (!oTable || !oToolbar) {
//                 return;
//             }

//             if (oToolbar._copyButtonAdded) {
//                 return;
//             }

//             const oCellSelector = new CellSelector();
//             oTable.addDependent(oCellSelector);


//             const oCopyProvider = new CopyProvider({
//                 extractData: this.extractData.bind(this),
//                 copy: this.onCopy.bind(this)
//             });
//             oTable.addDependent(oCopyProvider);


//             oToolbar.addContent(new sap.m.ToolbarSpacer());
//             oToolbar.addContent(oCopyProvider.getCopyButton());

//             oToolbar._copyButtonAdded = true;
//         },

//         extractData: function (oRowContext, oColumn) {
//             const sProp = oColumn.getSortProperty();
//             return sProp ? oRowContext.getProperty(sProp) : "";
//         },

//         onCopy: function (oEvent) {
//             const aData = oEvent.getParameter("data");
//             if (!aData || !aData.length) {
//                 MessageToast.show("Please select at least one cell to copy");
//                 return;
//             }
//             navigator.clipboard.writeText(
//                 aData.map(r => r.join("\t")).join("\n")
//             );
//             MessageToast.show("Copied " + aData.length + " row(s)");
//         },


//         setDefaultDateRange: function () {
//             var oDateRangeSelection = this.byId("DRS1");
//             var oToday = new Date();


//             var oFirstDay = new Date(oToday.getFullYear(), oToday.getMonth(), 1);


//             oDateRangeSelection.setDateValue(oFirstDay);
//             oDateRangeSelection.setSecondDateValue(oToday);
//         },




//         // addCopySupport: function (sTableId, sToolbarId) {
//         //     const oTable = this.byId(sTableId);
//         //     const oToolbar = this.byId(sToolbarId);
//         //     if (!oTable || !oToolbar) {
//         //         return;
//         //     }


//         //     const oCellSelector = new sap.m.plugins.CellSelector();
//         //     oTable.addDependent(oCellSelector);


//         //     const oCopyProvider = new sap.m.plugins.CopyProvider({
//         //         extractData: this.extractData.bind(this),
//         //         copy: this.onCopy.bind(this)
//         //     });
//         //     oTable.addDependent(oCopyProvider);


//         //     oToolbar.addContent(new sap.m.ToolbarSpacer());
//         //     oToolbar.addContent(oCopyProvider.getCopyButton());
//         // },

//         // extractData: function (oRowContext, oColumn) {
//         //     const sProp = oColumn.getSortProperty();
//         //     return sProp ? oRowContext.getProperty(sProp) : "";
//         // },

//         // onCopy: function (oEvent) {
//         //     const aData = oEvent.getParameter("data");
//         //     if (!aData || !aData.length) {
//         //         sap.m.MessageToast.show("Please select at least one cell to copy");
//         //         return;
//         //     }
//         //     navigator.clipboard.writeText(
//         //         aData.map(r => r.join("\t")).join("\n")
//         //     );
//         //     sap.m.MessageToast.show("Copied " + aData.length + " row(s)");
//         // },


//         onFilterSearch: function () {
//             var that = this;
//             var oModel = this.getOwnerComponent().getModel();

//             var oDateRangeSelection = this.byId("DRS1");
//             var oFromDate = oDateRangeSelection.getDateValue();
//             var oToDate = oDateRangeSelection.getSecondDateValue();

//             console.log("UI From Date:", oFromDate);
//             console.log("UI To Date:", oToDate);


//             if (!oFromDate || !oToDate) {
//                 sap.m.MessageToast.show("Please select both From and To dates");
//                 return;
//             }

//             var oFilterFromDate = new Date(Date.UTC(oFromDate.getFullYear(), oFromDate.getMonth(), oFromDate.getDate(), 0, 0, 0, 0));
//             var oFilterToDate = new Date(Date.UTC(oToDate.getFullYear(), oToDate.getMonth(), oToDate.getDate(), 0, 0, 0, 0));

//             var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
//                 pattern: "yyyy-MM-dd'T'HH:mm:ss"
//             });

//             var sFromDate = oDateFormat.format(oFilterFromDate);
//             var sToDate = oDateFormat.format(oFilterToDate);

//             console.log("Formatted FromDate:", sFromDate, "ToDate:", sToDate);
//             console.log("Filter FromDate Object:", oFilterFromDate);
//             console.log("Filter ToDate Object:", oFilterToDate);

//             var aFilters = [
//                 new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.GE, sFromDate),
//                 new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.LE, sToDate)
//             ];

//             oModel.read("/CustGrpSet", {
//                 filters: aFilters,
//                 success: function (oData) {
//                     console.log("Data received:", oData.results);
//                     that._originalData = JSON.parse(JSON.stringify(oData.results));
//                     var oHeaderModel = new sap.ui.model.json.JSONModel();
//                     oHeaderModel.setData(oData.results);
//                     that.getView().setModel(oHeaderModel, "CustGrpModel");
//                 },
//                 error: function (oError) {
//                     console.error("Error reading data:", oError);
//                 },
//             });
//         },



//         onCustGroupPress: function (oEvent) {
//             var oContext = oEvent.getSource().getBindingContext("CustGrpModel");
//             var sCustGroup = oContext.getProperty("KdgrpAuft");
//             this._sSelectedCustGroup = oContext.getProperty("KdgrpAuft");

//             var oDateRangeSelection = this.byId("DRS1");
//             var oFromDate = oDateRangeSelection.getDateValue();
//             var oToDate = oDateRangeSelection.getSecondDateValue();

//             if (!oFromDate || !oToDate) {
//                 sap.m.MessageToast.show("Please select date range");
//                 return;
//             }

//             var oFilterFromDate = new Date(Date.UTC(oFromDate.getFullYear(), oFromDate.getMonth(), oFromDate.getDate(), 0, 0, 0, 0));
//             var oFilterToDate = new Date(Date.UTC(oToDate.getFullYear(), oToDate.getMonth(), oToDate.getDate(), 0, 0, 0, 0));

//             var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
//                 pattern: "yyyy-MM-dd'T'HH:mm:ss"
//             });

//             var sFromDate = oDateFormat.format(oFilterFromDate);
//             var sToDate = oDateFormat.format(oFilterToDate);

//             var oModel = this.getView().getModel(); // OData model

//             oModel.read("/CustSaleOffSet", {
//                 filters: [
//                     new sap.ui.model.Filter("KdgrpAuft", sap.ui.model.FilterOperator.EQ, this._sSelectedCustGroup),
//                     new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.GE, sFromDate),
//                     new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.LE, sToDate)
//                 ],
//                 success: function (oData) {
//                     console.log("Sales office data:", oData.results);

//                     var oJSONModel = new sap.ui.model.json.JSONModel();
//                     oJSONModel.setData({ results: oData.results });

//                     this.getView().setModel(oJSONModel, "CustSaleModel");

//                     this.byId("salesOfficeTable").setVisible(true);
//                     this.byId("productTable").setVisible(false);


//                     this.byId("custGroupLink").setText("Customer Group>>" + sCustGroup);


//                 }.bind(this),
//                 error: function () {
//                     sap.m.MessageToast.show("Error loading sales office data");
//                 }
//             });
//         },


//         onBackPress: function () {
//             this.byId("salesOfficeTable").setVisible(false);
//             this.byId("productTable").setVisible(true);


//         },



//         onSalesOfficePress: function (oEvent) {
//             var oContext = oEvent.getSource().getBindingContext("CustSaleModel");

//             this._sVkbur = oContext.getProperty("Vkbur");

//             var sCustGroup = this._sSelectedCustGroup;
//             // var sCustGroup = oContext.getProperty("KdgrpAuft");

//             console.log("Context properties:", oContext.getObject());

//             var oDateRangeSelection = this.byId("DRS1");
//             var oFromDate = oDateRangeSelection.getDateValue();
//             var oToDate = oDateRangeSelection.getSecondDateValue();

//             if (!oFromDate || !oToDate) {
//                 sap.m.MessageToast.show("Please select date range");
//                 return;
//             }

//             var oFilterFromDate = new Date(Date.UTC(oFromDate.getFullYear(), oFromDate.getMonth(), oFromDate.getDate(), 0, 0, 0, 0));
//             var oFilterToDate = new Date(Date.UTC(oToDate.getFullYear(), oToDate.getMonth(), oToDate.getDate(), 0, 0, 0, 0));

//             var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
//                 pattern: "yyyy-MM-dd'T'HH:mm:ss"
//             });

//             var sFromDate = oDateFormat.format(oFilterFromDate);
//             var sToDate = oDateFormat.format(oFilterToDate);

//             var oModel = this.getView().getModel();

//             oModel.read("/CustSaleGrpSet", {
//                 filters: [
//                     new sap.ui.model.Filter("KdgrpAuft", sap.ui.model.FilterOperator.EQ, sCustGroup),
//                     new sap.ui.model.Filter("Vkbur", sap.ui.model.FilterOperator.EQ, this._sVkbur),
//                     new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.GE, sFromDate),
//                     new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.LE, sToDate)
//                 ],
//                 success: function (oData) {
//                     console.log("Sales group data:", oData.results);

//                     var oJSONModel = new sap.ui.model.json.JSONModel();
//                     oJSONModel.setData({ results: oData.results });

//                     this.getView().setModel(oJSONModel, "CustSalesGrpModel");

//                     this.byId("salesGroupTable").setVisible(true);
//                     this.byId("salesOfficeTable").setVisible(false);


//                     this.byId("SalesOffice").setText("Sales Office>>" + this._sVkbur);


//                 }.bind(this),
//                 error: function () {
//                     sap.m.MessageToast.show("Error loading sales group data");
//                 }
//             });
//         },

//         onBackPress2: function () {
//             this.byId("salesGroupTable").setVisible(false);
//             this.byId("salesOfficeTable").setVisible(true);


//         },



//         onSaleGroupPress: function (oEvent) {
//             var oContext = oEvent.getSource().getBindingContext("CustSalesGrpModel");
//             var sVkbur = this._sVkbur;
//             var sVkgrp = oContext.getProperty("Vkgrp");

//             var sCustGroup = this._sSelectedCustGroup;
//             // var sCustGroup = oContext.getProperty("KdgrpAuft");

//             console.log("Context properties:", oContext.getObject());

//             var oDateRangeSelection = this.byId("DRS1");
//             var oFromDate = oDateRangeSelection.getDateValue();
//             var oToDate = oDateRangeSelection.getSecondDateValue();

//             if (!oFromDate || !oToDate) {
//                 sap.m.MessageToast.show("Please select date range");
//                 return;
//             }

//             var oFilterFromDate = new Date(Date.UTC(oFromDate.getFullYear(), oFromDate.getMonth(), oFromDate.getDate(), 0, 0, 0, 0));
//             var oFilterToDate = new Date(Date.UTC(oToDate.getFullYear(), oToDate.getMonth(), oToDate.getDate(), 0, 0, 0, 0));

//             var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
//                 pattern: "yyyy-MM-dd'T'HH:mm:ss"
//             });

//             var sFromDate = oDateFormat.format(oFilterFromDate);
//             var sToDate = oDateFormat.format(oFilterToDate);

//             var oModel = this.getView().getModel();

//             oModel.read("/CustCodeSet", {
//                 filters: [
//                     new sap.ui.model.Filter("KdgrpAuft", sap.ui.model.FilterOperator.EQ, sCustGroup),
//                     new sap.ui.model.Filter("Vkbur", sap.ui.model.FilterOperator.EQ, sVkbur),
//                     new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.GE, sFromDate),
//                     new sap.ui.model.Filter("Fkdat", sap.ui.model.FilterOperator.LE, sToDate),
//                     new sap.ui.model.Filter("Vkgrp", sap.ui.model.FilterOperator.EQ, sVkgrp),
//                 ],
//                 success: function (oData) {
//                     console.log("Sales group data:", oData.results);

//                     var oJSONModel = new sap.ui.model.json.JSONModel();
//                     oJSONModel.setData({ results: oData.results });

//                     this.getView().setModel(oJSONModel, "CustModel");

//                     this.byId("customerDetails").setVisible(true);
//                     this.byId("salesGroupTable").setVisible(false);


//                     this.byId("SalesGroup").setText("SalesGroup>>" + sVkgrp);


//                 }.bind(this),
//                 error: function () {
//                     sap.m.MessageToast.show("Error loading sales group data");
//                 }
//             });
//         },

//         onBackPress3: function () {
//             this.byId("customerDetails").setVisible(false);
//             this.byId("salesGroupTable").setVisible(true);


//         },

//     });
// })













