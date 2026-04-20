// sap.ui.define([], function () {
//     "use strict";
//     return {
//         toLacsCrores: function (value, unit) {
//             if (value === null || value === undefined || value === "") {
//                 return "0.00";
//             }

//             var num = parseFloat(value);
//             if (isNaN(num)) {
//                 return "0.00";
//             }

//             if (unit === "LACS") {
//                 return (num / 100000).toFixed(2) + " Lacs";
//             } else if (unit === "CRORES") {
//                 return (num / 10000000).toFixed(2) + " Crores";
//             } else {
//                 // fallback → default to Lacs
//                 return (num / 100000).toFixed(2) + " Lacs";
//             }
//         }
//     };
// });



// sap.ui.define([], function () {
//     "use strict";
//     return {
//         toLacsCrores: function (value, unit) {
//             if (value === null || value === undefined || value === "") {
//                 return "0.00";
//             }

//             // Always treat as number
//             var num = Number(value);
//             if (isNaN(num)) {
//                 return "0.00";
//             }

//             // Default unit if not passed
//             if (!unit) {
//                 unit = "LACS"; // default
//             }

//             if (unit === "LACS") {
//                 return (num / 100000).toFixed(3) + " Lacs";
//             } else if (unit === "CRORES") {
//                 return (num / 10000000).toFixed(3) + " Crores";
//             } else {
//                 return num.toFixed(3);
//             }
//         }
//     };
// });


// sap.ui.define([], function () {
//     "use strict";
//     return {
//         toLacsCrores: function (value, unit) {
//             if (value === null || value === undefined || value === "") {
//                 return "0.00";
//             }

//             // Edm.Decimal arrives as string → convert
//             var num = Number(value);
//             if (isNaN(num)) {
//                 return "0.00";
//             }

//             // Default to LACS if nothing given
//             if (!unit || unit === "LACS") {
//                 if (num < 100000) {
//                     return num.toFixed(2); // show raw if less than 1 Lac
//                 }
//                 return (num / 100000).toFixed(2) + " Lacs";
//             } else if (unit === "CRORES") {
//                 if (num < 10000000) {
//                     return (num / 100000).toFixed(2) + " Lacs"; // fallback
//                 }
//                 return (num / 10000000).toFixed(2) + " Crores";
//             } else {
//                 return num.toFixed(2);
//             }
//         }
//     };
// });




sap.ui.define([], function () {
    "use strict";
    return {
        toLacsCrores: function (value, unit) {
            if (value === null || value === undefined || value === "") {
                return "0.00";
            }

            var num = Number(value);
            if (isNaN(num)) {
                return "0.00";
            }

            if (unit === "LACS") {
                return (num / 100000).toFixed(2) + " Lacs";
            } else if (unit === "CRORES") {
                return (num / 10000000).toFixed(2) + " Crores";
            } else {
                // default: treat as Lacs
                return (num / 100000).toFixed(2) + " Lacs";
            }
        }
    };
});